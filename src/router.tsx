import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from "@tanstack/react-router";
import App from "./App";
import NFTDetails from "./pages/NFTDetails";

const rootRoute = createRootRoute({
  component: Outlet,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    category: typeof search.category === "string" ? search.category : "Todos",
    sort:
      search.sort === "low" || search.sort === "high"
        ? search.sort
        : "featured",
    page: Math.max(1, Number(search.page) || 1),
  }),
  component: App,
});

const nftDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nft/$nftId",
  component: NFTDetails,
});

const routeTree = rootRoute.addChildren([indexRoute, nftDetailsRoute]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
