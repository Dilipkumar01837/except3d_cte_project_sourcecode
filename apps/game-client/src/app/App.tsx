import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './router/AppRouter';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRouter />
        </ErrorBoundary>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
