import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import FontSizeToggle from '../FontSizeToggle';
import { FontSizeProvider } from '../../context/FontSizeContext';

// Mock the react-icons/fa module
vi.mock('react-icons/fa', () => ({
  FaPlus: () => <span data-testid="plus-icon">+</span>
}));

describe('FontSizeToggle', () => {
  // Test 1: Renders with correct initial state
  test('renders with correct initial state', () => {
    render(
      <FontSizeProvider>
        <FontSizeToggle />
      </FontSizeProvider>
    );

    // Test accessible elements
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Toggle font size. Current level: 1 of 3');
    expect(button).toHaveAttribute('title', 'Increase font size for easier reading');
    
    // Test visual elements
    expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  // Test 2: Cycles through font sizes when clicked
  test('cycles through font sizes when clicked', () => {
    render(
      <FontSizeProvider>
        <FontSizeToggle />
      </FontSizeProvider>
    );

    const button = screen.getByRole('button');
    
    // First click
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Toggle font size. Current level: 2 of 3');
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Second click
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Toggle font size. Current level: 3 of 3');
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Third click (back to 1)
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'Toggle font size. Current level: 1 of 3');
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  // Test 3: Applies correct font size to document
  test('applies correct font size to document', () => {
    render(
      <FontSizeProvider>
        <FontSizeToggle />
      </FontSizeProvider>
    );

    const button = screen.getByRole('button');
    
    // Initial state
    expect(document.documentElement.style.fontSize).toBe('');
    
    // First click - medium size
    fireEvent.click(button);
    expect(document.documentElement.style.fontSize).toBe('1.3rem');
    
    // Second click - large size
    fireEvent.click(button);
    expect(document.documentElement.style.fontSize).toBe('1.6rem');
    
    // Third click - back to default
    fireEvent.click(button);
    expect(document.documentElement.style.fontSize).toBe('');
  });
}); 