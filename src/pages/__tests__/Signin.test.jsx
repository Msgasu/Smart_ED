// Mock declarations must be at the top level
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      update: vi.fn().mockReturnThis()
    }))
  }
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ to, children, ...props }) => (
      <a href={to} {...props} onClick={(e) => {
        e.preventDefault();
        mockNavigate(to);
      }}>
        {children}
      </a>
    )
  };
});

vi.mock('sweetalert2', () => ({
  default: {
    fire: vi.fn().mockResolvedValue({ isConfirmed: true })
  }
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Signin from '../Signin';

// Mock the navigate function
const mockNavigate = vi.fn();

describe('Signin Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Renders the signin form correctly
  test('renders signin form with all elements', () => {
    render(
      <BrowserRouter>
        <Signin />
      </BrowserRouter>
    );

    // Check for main elements
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  // Test 2: Form validation
  test('validates required fields', () => {
    render(
      <BrowserRouter>
        <Signin />
      </BrowserRouter>
    );

    // Try to submit without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    // Check for validation messages
    expect(screen.getByLabelText(/email/i)).toBeInvalid();
    expect(screen.getByLabelText(/password/i)).toBeInvalid();
  });

  // Test 3: Form input handling
  test('handles form input changes', () => {
    render(
      <BrowserRouter>
        <Signin />
      </BrowserRouter>
    );

    // Test email input
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    expect(screen.getByLabelText(/email/i).value).toBe('test@example.com');

    // Test password input
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    expect(screen.getByLabelText(/password/i).value).toBe('password123');
  });

  // Test 4: Navigation to signup
  test('navigates to signup page', () => {
    render(
      <BrowserRouter>
        <Signin />
      </BrowserRouter>
    );

    const signupLink = screen.getByText(/sign up/i);
    fireEvent.click(signupLink);
    expect(mockNavigate).toHaveBeenCalledWith('/signup');
  });
}); 