import { createBrowserRouter } from 'react-router';
import {LoginPage} from './pages/LoginPage';
import {AuthPage} from './pages/AuthPage';

const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
  },
  {
    path: '/auth',
    Component: AuthPage,
  },
]);

export default router;