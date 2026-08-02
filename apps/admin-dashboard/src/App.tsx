import { BrowserRouter } from 'react-router-dom';
import { AdminRouter } from './app/router/AdminRouter';

export function App() {
  return (
    <BrowserRouter>
      <AdminRouter />
    </BrowserRouter>
  );
}
