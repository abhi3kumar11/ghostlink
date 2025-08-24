import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Ghost, LogOut, Settings, Shield, Users, Video, MessageCircle, Calendar } from 'lucide-react'

function Header({ anonId, isAuthenticated, onLogout }) {
  const location = useLocation()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const navigationItems = [
    { path: '/', label: 'Lobby', icon: Users },
    { path: '/chat', label: 'Chat', icon: MessageCircle },
    { path: '/video', label: 'Video', icon: Video },
    { path: '/meeting', label: 'Meeting', icon: Calendar },
  ]

  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  // Close dropdown when clicking outside
  const userMenuRef = useRef(null)
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [userMenuRef])

  return (
    <header className="navbar sticky top-0 z-50 bg-base-100/50 backdrop-blur-lg border-b border-base-300/10">
      <div className="navbar-start">
        <Link to="/" className="btn btn-ghost text-xl font-bold text-primary hover:bg-transparent">
          <Ghost className="w-6 h-6 mr-2" />
          GhostLink
        </Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        {isAuthenticated && (
          <ul className="menu menu-horizontal px-1 space-x-2">
            {navigationItems.map(({ path, label, icon: Icon }) => (
              <li key={path}>
                <Link
                  to={path}
                  className={`btn btn-ghost btn-sm ${
                    isActivePath(path) ? 'btn-active text-primary' : ''
                  }`}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="navbar-end">
        {isAuthenticated ? (
          <div className="dropdown dropdown-end" ref={userMenuRef}>
            <div
              tabIndex={0}
              role="button"
              className="btn btn-ghost btn-circle avatar placeholder"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div className="bg-primary text-primary-content rounded-full w-10">
                <span className="text-sm font-bold">
                  {anonId ? anonId.slice(0, 2).toUpperCase() : 'AN'}
                </span>
              </div>
            </div>
            
            {showUserMenu && (
              <ul
                tabIndex={0}
                className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow-2xl bg-base-200 rounded-box w-64 border border-base-300/20"
              >
                <li className="menu-title">
                  <span className="flex items-center">
                    <Shield className="w-4 h-4 mr-2" />
                    Anonymous Identity
                  </span>
                </li>
                <li>
                  <div className="flex flex-col items-start p-2">
                    <span className="font-mono text-sm text-primary font-bold">
                      ID: {anonId}
                    </span>
                    <span className="text-xs text-base-content/60">
                      Session expires in 1h
                    </span>
                  </div>
                </li>
                <div className="divider my-1"></div>
                <li className="disabled">
                  <button className="flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </button>
                </li>
                <li onClick={() => setShowUserMenu(false)}>
                  <button 
                    onClick={onLogout}
                    className="flex items-center text-error hover:bg-error/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    End Session
                  </button>
                </li>
              </ul>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="badge badge-ghost badge-sm">
              Anonymous
            </div>
          </div>
        )}
      </div>

      {/* Mobile menu */}
      {isAuthenticated && (
        <div className="navbar-end lg:hidden">
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-200 rounded-box w-52"
            >
              {navigationItems.map(({ path, label, icon: Icon }) => (
                <li key={path}>
                  <Link
                    to={path}
                    className={`flex items-center ${
                      isActivePath(path) ? 'active text-primary' : ''
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
