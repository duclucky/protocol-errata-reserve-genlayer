export type AppRoute = 'home' | 'start' | 'reviews' | 'case' | 'history' | 'account' | 'help';

export function parseRoute(pathname: string): {route: AppRoute; caseId?: string} {
  if (pathname.startsWith('/cases/')) {
    return {route: 'case', caseId: decodeURIComponent(pathname.slice('/cases/'.length))};
  }
  if (pathname === '/start') return {route: 'start'};
  if (pathname === '/reviews') return {route: 'reviews'};
  if (pathname === '/history') return {route: 'history'};
  if (pathname === '/account') return {route: 'account'};
  if (pathname === '/help') return {route: 'help'};
  return {route: 'home'};
}
