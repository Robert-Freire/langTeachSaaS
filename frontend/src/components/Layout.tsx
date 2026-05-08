import { Link, Outlet } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { BRAND_NAME } from '@/lib/brand'

export default function Layout() {
  const { user, logout } = useAuth0()

  return (
    <div className="app-layout">
      <header>
        <h1>{BRAND_NAME}</h1>
        <div>
          <span>{user?.email}</span>
          <Link to="/settings">Settings</Link>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}>
            Log out
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
