/**
 * Test Setup Validation
 * 
 * Simple tests to verify our testing infrastructure is working correctly
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { server } from '@/mocks/server';
import { resetMockData } from '@/mocks/handlers';

// Simple test component
const TestComponent: React.FC<{ title: string }> = ({ title }) => {
  return (
    <div>
      <h1>{title}</h1>
      <p>Testing setup is working!</p>
    </div>
  );
};

describe('Test Setup Validation', () => {
  beforeEach(() => {
    resetMockData();
  });

  test('React Testing Library is working', () => {
    render(<TestComponent title="Hello Testing!" />);
    
    expect(screen.getByText('Hello Testing!')).toBeInTheDocument();
    expect(screen.getByText('Testing setup is working!')).toBeInTheDocument();
  });

  test('Jest DOM matchers are available', () => {
    render(<TestComponent title="DOM Testing" />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('DOM Testing');
  });

  test('MSW server is running', () => {
    // MSW server should be running (no errors thrown)
    expect(server).toBeDefined();
    expect(typeof server.listen).toBe('function');
    expect(typeof server.resetHandlers).toBe('function');
    expect(typeof server.close).toBe('function');
  });

  test('Mock data reset is working', () => {
    // This tests that our mock data helpers are available
    expect(typeof resetMockData).toBe('function');
    
    // Should not throw an error
    resetMockData();
  });

  test('Environment variables are mocked', () => {
    // Test that our mocked Clerk and Supabase are available
    const { useUser } = require('@clerk/nextjs');
    const mockUser = useUser();
    
    expect(mockUser.isLoaded).toBe(true);
    expect(mockUser.isSignedIn).toBe(true);
    expect(mockUser.user.id).toBe('test-user-id');
  });
}); 