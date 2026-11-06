import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { StudyProvider } from "@/contexts/StudyContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import SessionsPage from "./pages/SessionsPage";
import SubjectsPage from "./pages/SubjectsPage";
import GoalsPage from "./pages/GoalsPage";
import PomodoroPage from "./pages/PomodoroPage";
import CoursesPage from "./pages/CoursesPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LearningPathsPage from "./pages/LearningPathsPage";
import LanguagesPage from "./pages/LanguagesPage";
import LanguageDetailPage from "./pages/LanguageDetailPage";
import PlannerPage from "./pages/PlannerPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedApp({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <StudyProvider>
        {children}
      </StudyProvider>
    </ProtectedRoute>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/" element={<ProtectedApp><Dashboard /></ProtectedApp>} />
              <Route path="/calendar" element={<ProtectedApp><CalendarPage /></ProtectedApp>} />
              <Route path="/sessions" element={<ProtectedApp><SessionsPage /></ProtectedApp>} />
              <Route path="/subjects" element={<ProtectedApp><SubjectsPage /></ProtectedApp>} />
              <Route path="/pomodoro" element={<ProtectedApp><PomodoroPage /></ProtectedApp>} />
              <Route path="/courses" element={<ProtectedApp><CoursesPage /></ProtectedApp>} />
              <Route path="/goals" element={<ProtectedApp><GoalsPage /></ProtectedApp>} />
              <Route path="/learning-paths" element={<ProtectedApp><LearningPathsPage /></ProtectedApp>} />
              <Route path="/languages" element={<ProtectedApp><LanguagesPage /></ProtectedApp>} />
              <Route path="/languages/:id" element={<ProtectedApp><LanguageDetailPage /></ProtectedApp>} />
              <Route path="/planejador" element={<ProtectedApp><PlannerPage /></ProtectedApp>} />
              <Route path="/settings" element={<ProtectedApp><SettingsPage /></ProtectedApp>} />
              <Route path="/admin" element={<ProtectedApp><AdminPage /></ProtectedApp>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
