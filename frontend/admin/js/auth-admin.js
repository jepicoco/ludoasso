/**
 * Authentication Module for Admin Interface
 */

/**
 * Check if user is authenticated
 */
const isAuthenticated = () => {
  const token = localStorage.getItem('authToken');
  return !!token;
};

/**
 * Get current user from localStorage
 */
const getCurrentUser = () => {
  const userJson = localStorage.getItem('currentUser');
  return userJson ? JSON.parse(userJson) : null;
};

/**
 * Set current user in localStorage
 */
const setCurrentUser = (user) => {
  localStorage.setItem('currentUser', JSON.stringify(user));
  // Stocker également le rôle séparément pour un accès facile
  if (user && user.role) {
    localStorage.setItem('userRole', user.role);
  }
};

/**
 * Remove current user from localStorage
 */
const removeCurrentUser = () => {
  localStorage.removeItem('currentUser');
  localStorage.removeItem('userRole');
};

/**
 * Redirect to login if not authenticated
 */
const requireAuth = () => {
  if (!isAuthenticated()) {
    window.location.href = '/admin/login.html';
    return false;
  }
  return true;
};

/**
 * Alias for requireAuth (for backward compatibility)
 */
const checkAuth = requireAuth;

/**
 * Redirect to dashboard if already authenticated
 */
const redirectIfAuthenticated = () => {
  if (isAuthenticated()) {
    window.location.href = '/admin/dashboard.html';
    return true;
  }
  return false;
};

/**
 * Initialize user session
 */
const initSession = async () => {
  if (!isAuthenticated()) {
    return null;
  }

  try {
    const data = await authAPI.getProfile();
    setCurrentUser(data.user);
    return data.user;
  } catch (error) {
    console.error('Failed to initialize session:', error);
    removeAuthToken();
    removeCurrentUser();
    return null;
  }
};

/**
 * Logout user
 */
const logout = () => {
  removeAuthToken();
  removeCurrentUser();
  window.location.href = '/admin/login.html';
};

/**
 * Update user profile display
 */
const updateUserDisplay = (user) => {
  const userNameElement = document.getElementById('userName');
  const userEmailElement = document.getElementById('userEmail');

  if (userNameElement && user) {
    userNameElement.textContent = `${user.prenom} ${user.nom}`;
  }

  if (userEmailElement && user) {
    userEmailElement.textContent = user.email;
  }
};

/**
 * Initialize auth on page load
 */
document.addEventListener('DOMContentLoaded', async () => {
  const isLoginPage = window.location.pathname.includes('login.html');

  if (isLoginPage) {
    redirectIfAuthenticated();
  } else {
    if (requireAuth()) {
      const user = await initSession();
      if (user) {
        updateUserDisplay(user);
      }
    }
  }
});
