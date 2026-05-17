import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { ConfigProvider, theme } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import AppLayout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import { AuthProvider, useAuth } from './context/AuthContext';
import Statistics from './pages/Statistics';
import Expenses from "./pages/Expenses.tsx";
import Budgets from "./pages/Budgets.tsx";

// Глобальные стили для темного фона всего приложения
const globalStyles = `
  body {
    background-color: #000000; /* Или #141414 как в стандарте dark mode */
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
  }
`;

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return <div style={{ color: 'white', textAlign: 'center', marginTop: 50 }}>Загрузка...</div>;

    if (!user) {
        return <Navigate to="/sign-in" replace />;
    }

    return <>{children}</>;
};

const AppContent: React.FC = () => {
    return (
        <>
            <style>{globalStyles}</style>
            <Routes>
                <Route path="/sign-in" element={<Login />} />
                <Route path="/sign-up" element={<Register />} />

                <Route path="/" element={
                    <ProtectedRoute>
                        <AppLayout>
                            <Expenses />
                        </AppLayout>
                    </ProtectedRoute>
                } />

                <Route path="/me" element={
                    <ProtectedRoute>
                        <AppLayout>
                            <Profile />
                        </AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/statistics" element={
                    <ProtectedRoute>
                        <AppLayout>
                            <Statistics />
                        </AppLayout>
                    </ProtectedRoute>
                } />
                <Route path="/budgets" element={
                    <ProtectedRoute>
                        <AppLayout>
                            <Budgets />
                        </AppLayout>
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
};

const App: React.FC = () => {
    return (
        <ConfigProvider
            locale={ruRU}
            theme={{
                algorithm: theme.darkAlgorithm,
            }}
        >
            <BrowserRouter>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </BrowserRouter>
        </ConfigProvider>
    );
};

export default App;