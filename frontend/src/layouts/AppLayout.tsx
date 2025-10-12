import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';
import '../App.css';

export const AppLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h1>BalancedBite</h1>
          {user && (
            <p>
              Sveiki, <strong>{user.first_name ?? user.email}</strong>
            </p>
          )}
        </div>
        <nav className="nav-links">
          <NavLink to="/plans" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Mitybos planai
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'active' : undefined)}>
            Mano profilis
          </NavLink>
        </nav>
        <button type="button" onClick={logout} className="secondary-button">
          Atsijungti
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
