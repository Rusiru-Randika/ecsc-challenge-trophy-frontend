import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import Home from "./pages/Home";
import Teams from "./pages/Teams";
import Matches from "./pages/Matches";
import Fixtures from "./pages/Fixtures";
import Standings from "./pages/Standings";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const isAdmin = !!localStorage.getItem("token");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex flex-col">
        {/* Navigation */}
        <nav className="bg-white shadow-lg sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              {/* Logo */}
              <Link
                to="/"
                onClick={closeMobileMenu}
                className="flex items-center space-x-2"
              >
                <span className="text-2xl md:text-3xl">🏆</span>
                <h1 className="text-lg md:text-2xl font-bold text-blue-600">
                  ECSC Challenge Trophy
                </h1>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center space-x-6">
                <Link
                  to="/"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Home
                </Link>
                <Link
                  to="/fixtures"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Fixtures
                </Link>
                <Link
                  to="/standings"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Standings
                </Link>
                <Link
                  to="/matches"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Matches
                </Link>
                <Link
                  to="/teams"
                  className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Teams
                </Link>
                {isAdmin ? (
                  <>
                    <Link
                      to="/admin"
                      className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                    >
                      Admin Panel
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/admin/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Admin Login
                  </Link>
                )}
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-gray-700 hover:text-blue-600 focus:outline-none"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {mobileMenuOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Mobile Navigation Dropdown */}
            {mobileMenuOpen && (
              <div className="lg:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
                <div className="flex flex-col space-y-3">
                  <Link
                    to="/"
                    onClick={closeMobileMenu}
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    🏠 Home
                  </Link>
                  <Link
                    to="/fixtures"
                    onClick={closeMobileMenu}
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    📋 Fixtures
                  </Link>
                  <Link
                    to="/standings"
                    onClick={closeMobileMenu}
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    📊 Standings
                  </Link>
                  <Link
                    to="/matches"
                    onClick={closeMobileMenu}
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    🎯 Matches
                  </Link>
                  <Link
                    to="/teams"
                    onClick={closeMobileMenu}
                    className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-colors px-4 py-2 rounded-lg"
                  >
                    👥 Teams
                  </Link>
                  {isAdmin ? (
                    <>
                      <Link
                        to="/admin"
                        onClick={closeMobileMenu}
                        className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-colors px-4 py-2 rounded-lg"
                      >
                        ⚙️ Admin Panel
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          closeMobileMenu();
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors font-medium text-left"
                      >
                        🚪 Logout
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/admin/login"
                      onClick={closeMobileMenu}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                    >
                      🔐 Admin Login
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Routes */}
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white py-4 sm:py-6 border-t mt-auto">
          <div className="container mx-auto px-4 text-center text-gray-600">
            <p className="text-xs sm:text-sm md:text-base">
              Built With ❤️ By Rusiru ECS3 To ECS Community
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
