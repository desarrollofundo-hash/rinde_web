
import { Suspense, lazy } from "react";
import './App.css'
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import {
    getFirstAllowedDashboardPath,
    isDashboardPathAllowed,
    readPermissionsFromStorage,
} from "./services/permissions";

const Login = lazy(() => import("./components/Login"));
const Company = lazy(() => import("./components/Company"));
const Dashboard = lazy(() => import("./components/Dashboard"));

function readSession() {
    try {
        const userRaw = localStorage.getItem("user");
        const companyRaw = localStorage.getItem("company");
        const permissions = readPermissionsFromStorage();

        const user = userRaw ? JSON.parse(userRaw) : null;
        const company = companyRaw ? JSON.parse(companyRaw) : null;

        return { user, company, permissions };
    } catch {
        return { user: null, company: null, permissions: readPermissionsFromStorage() };
    }
}

function LoginRoute() {
    const { user, company, permissions } = readSession();
    const firstAllowed = getFirstAllowedDashboardPath(permissions);

    if (user && company) return <Navigate to={firstAllowed} replace />;
    if (user && !company) return <Navigate to="/company" replace />;

    return <Login />;
}

function RootRoute() {
    const { user, company, permissions } = readSession();
    const firstAllowed = getFirstAllowedDashboardPath(permissions);

    if (user && company) return <Navigate to={firstAllowed} replace />;
    if (user && !company) return <Navigate to="/company" replace />;

    return <Navigate to="/login" replace />;
}

function CompanyRoute() {
    const { user, company, permissions } = readSession();
    const firstAllowed = getFirstAllowedDashboardPath(permissions);

    if (!user) return <Navigate to="/login" replace />;
    if (company) return <Navigate to={firstAllowed} replace />;

    return <Company />;
}

function DashboardRoute({ requiredPath }) {
    const { user, company, permissions } = readSession();
    const firstAllowed = getFirstAllowedDashboardPath(permissions);

    if (!user) return <Navigate to="/login" replace />;
    if (!company) return <Navigate to="/company" replace />;
    if (!isDashboardPathAllowed(requiredPath, permissions)) return <Navigate to={firstAllowed} replace />;

    return <Dashboard />;
}

function App() {
    return (
        <HashRouter>
            <Suspense fallback={null}>
                <Routes>
                    <Route path="/" element={<RootRoute />} />
                    <Route path="/login" element={<LoginRoute />} />
                    <Route path="/company" element={<CompanyRoute />} />
                    <Route path="/dashboard" element={<RootRoute />} />
                    <Route path="/dashboard/gastos" element={<DashboardRoute requiredPath="/dashboard/gastos" />} />
                    <Route path="/dashboard/informe" element={<DashboardRoute requiredPath="/dashboard/informe" />} />
                    <Route path="/dashboard/auditoria" element={<DashboardRoute requiredPath="/dashboard/auditoria" />} />
                    <Route path="/dashboard/revision" element={<DashboardRoute requiredPath="/dashboard/revision" />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Suspense>
        </HashRouter>
    );
}

export default App
