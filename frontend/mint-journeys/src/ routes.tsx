import { createBrowserRouter } from 'react-router';
import { LoginPage } from './pages/LoginPage';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { TripFormPage } from './pages/TripFormPage';
import { ErrorPage } from './pages/ErrorPage';
import{AppLayout}from './pages/AppLayout'
import {TripDetailPage}from'./pages/TripDetailPage'
import{TransactionFormPage}from "./pages/TransactionFormPage"
import{TransactionDetailPage}from"./pages/TransactionDetailPage"

const router = createBrowserRouter([
  {
    path: '/',
    Component: LoginPage,
    errorElement: <ErrorPage />,
  },
  {
    path: '/auth',
    Component: AuthPage,
    errorElement: <ErrorPage />,
  },
  {
    path: '/',
    Component: AppLayout,
    errorElement: <ErrorPage />,
    children: [
      { path: 'home', Component: HomePage },
      { path: '/trip/new', Component: TripFormPage },
      { path: '/trip/:tripId/edit', Component: TripFormPage },
      { path: '/trip/:tripId', Component: TripDetailPage },
      { path: '/transaction/:tripId/new', Component: TransactionFormPage },
      { path: '/transaction/:transactionId', Component: TransactionDetailPage }
    ],
  },
]);

export default router;
