import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';
import '../App.css';

export const AppLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="top-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <span className="brand-icon">🥗</span>
            <h1 className="brand-name">FitBite</h1>
          </div>
          
          <nav className="navbar-nav">
            <NavLink to="/plans" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              📋 Mitybos planai
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              👤 Mano profilis
            </NavLink>
          </nav>

          <div className="navbar-user">
            {user && (
              <div className="user-info">
                <span className="user-greeting">Sveiki,</span>
                <strong className="user-name">{user.first_name ?? user.email}</strong>
              </div>
            )}
            <button type="button" onClick={logout} className="logout-button">
              🚪 Atsijungti
            </button>
          </div>
        </div>
      </header>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
