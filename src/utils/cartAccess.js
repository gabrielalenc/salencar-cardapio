export function isAuthenticatedCartOwner(user, cartOwnerId, authLoading = false) {
  return !authLoading && user?.role === 'customer' && Boolean(user.id) && user.id === cartOwnerId;
}
