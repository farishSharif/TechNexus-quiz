import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/components/theme/theme-provider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Join from "./pages/Join";
import Browse from "./pages/Browse";
import Create from "./pages/Create";
import Edit from "./pages/Edit";
import Dashboard from "./pages/Dashboard";
import Host from "./pages/Host";
import Play from "./pages/Play";
import Admin from "./pages/Admin";
import QuizDetail from "./pages/QuizDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/join" element={<Join />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/create" element={<Create />} />
              <Route path="/edit/:quizId" element={<Edit />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/host/:sessionId" element={<Host />} />
              <Route path="/play/:sessionId" element={<Play />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/quiz/:quizId" element={<QuizDetail />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;