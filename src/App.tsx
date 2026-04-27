import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Slate from "@/pages/Slate";
import Matchup from "@/pages/Matchup";
import SettingsPage from "@/pages/Settings";
import Placeholder from "@/pages/Placeholder";

// Persist React Query cache so revisits/refreshes hydrate instantly
// from the previous successful response and only re-fetch in the
// background. The full loading animation is reserved for true cold loads.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000, // keep cached entries around for 24h
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "gamelens.query-cache",
});

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={{
      persister,
      maxAge: 24 * 60 * 60 * 1000,
      // Bump if the response shape changes so old cache is discarded.
      buster: "v1",
      dehydrateOptions: {
        // Only persist successful queries — never store error states.
        shouldDehydrateQuery: (query) => query.state.status === "success",
      },
    }}
  >
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Slate /></ProtectedRoute>} />
            <Route path="/matchup/:id" element={<ProtectedRoute><Matchup /></ProtectedRoute>} />
            <Route path="/matchup-lens" element={<ProtectedRoute><Placeholder title="Matchup Lens" /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </PersistQueryClientProvider>
);

export default App;
