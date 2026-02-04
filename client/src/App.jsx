import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import ConfirmationPage from './pages/ConfirmationPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="book" element={<BookingPage />} />
          <Route path="confirmation" element={<ConfirmationPage />} />
        </Route>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/login" element={<AdminLogin />} />
      </Routes>
    </Router>
  );
}

export default App;
