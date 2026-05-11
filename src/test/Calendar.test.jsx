import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import FamilyCalendar from '../pages/FamilyCalendar';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';

// Mock AuthContext
const mockAuthContext = {
  currentUser: { uid: 'test-user', email: 'test@example.com' },
  userProfile: { firstName: 'Test', lastName: 'User' },
  login: vi.fn(),
  logout: vi.fn(),
  signInWithGoogle: vi.fn(),
};

// Mock Firebase
vi.mock('../firebase/config', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({
    docs: []
  })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(),
  Timestamp: {
    fromDate: vi.fn(),
  },
}));

const renderWithRouter = (component) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <ThemeProvider>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ThemeProvider>
    </AuthContext.Provider>
  );
};

describe('FamilyCalendar', () => {
  it('should render calendar component', async () => {
    renderWithRouter(<FamilyCalendar />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /calendar/i })).toBeInTheDocument();
    });
  });

  it('should display calendar views', async () => {
    renderWithRouter(<FamilyCalendar />);
    
    await waitFor(() => {
      expect(screen.getByTitle(/day/i)).toBeInTheDocument();
      expect(screen.getByTitle(/week/i)).toBeInTheDocument();
      expect(screen.getByTitle(/month/i)).toBeInTheDocument();
    });
  });
});

