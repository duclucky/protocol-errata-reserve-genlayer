import {routes} from '../productCopy';
import type {AppRoute} from '../routing';

export function ProductNav({active, onNavigate}: {active: AppRoute; onNavigate: (path: string) => void}) {
  return (
    <nav className="product-nav" aria-label="Primary">
      {routes.map((route) => (
        <a
          key={route.id}
          href={route.path}
          aria-current={active === route.id ? 'page' : undefined}
          onClick={(event) => {
            event.preventDefault();
            onNavigate(route.path);
          }}
        >
          {route.label}
        </a>
      ))}
    </nav>
  );
}
