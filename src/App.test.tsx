import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { store } from './store';
import type { ReactNode } from 'react';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Route: ({ element }: { element: ReactNode }) => element,
  lazy: vi.fn((fn: () => unknown) => {
    const Component = vi.fn().mockImplementation(() => {
      const ActualComponent = fn();
      return ActualComponent;
    });
    return Component;
  }),
}));

// Mock the lazy loaded components
vi.mock('./pages/FAQPage', () => ({
  default: () => <div>FAQ Page</div>,
}));

vi.mock('./pages/PrivacyPage', () => ({
  default: () => <div>Privacy Page</div>,
}));

// Mock ECCGamePage
vi.mock('./pages/ECCGamePage', () => ({
  default: ({ mode }: { mode: string }) => (
    <div>
      <h1>ECC Crypto Playground</h1>
      {mode === 'practice' && <div>Practice Mode</div>}
    </div>
  ),
}));

describe('App', () => {
  const renderApp = () => {
    return render(
      <Provider store={store}>
        <App />
      </Provider>
    );
  };

  it('renders without crashing', () => {
    renderApp();
    expect(screen.getAllByText(/ECC Crypto Playground/i)).toHaveLength(2);
  });

  it('renders app structure correctly', () => {
    const { container } = renderApp();
    expect(container.querySelector('.App')).toBeInTheDocument();
  });
});
