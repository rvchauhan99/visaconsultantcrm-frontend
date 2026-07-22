import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

// Customer surface
import CustomerLayout from "@/layouts/CustomerLayout";
import Landing from "@/pages/customer/Landing";
import VisaDetail from "@/pages/customer/VisaDetail";
import Apply from "@/pages/customer/Apply";
import StatusTracker from "@/pages/customer/StatusTracker";
import Account from "@/pages/customer/Account";
import AuthPage from "@/pages/customer/AuthPage";

// CRM surface
import CrmLayout from "@/layouts/CrmLayout";
import CrmLogin from "@/pages/crm/CrmLogin";
import CrmDashboard from "@/pages/crm/CrmDashboard";
import Pipeline from "@/pages/crm/Pipeline";
import CaseDetail from "@/pages/crm/CaseDetail";
import Products from "@/pages/crm/Products";
import ProductBuilder from "@/pages/crm/ProductBuilder";
import Consultants from "@/pages/crm/Consultants";
import Reports from "@/pages/crm/Reports";
import OfflineCase from "@/pages/crm/OfflineCase";
import PassportExpiry from "@/pages/crm/PassportExpiry";

import { getUser } from "@/lib/api";

function RequireCustomer({ children }) {
    const u = getUser();
    if (!u || u.role !== "customer") return <Navigate to="/auth" replace />;
    return children;
}
function RequireStaff({ children }) {
    const u = getUser();
    if (!u || (u.role !== "consultant" && u.role !== "admin")) return <Navigate to="/crm/login" replace />;
    return children;
}
function RequireAdmin({ children }) {
    const u = getUser();
    if (!u || u.role !== "admin") return <Navigate to="/crm" replace />;
    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-right" richColors />
            <Routes>
                {/* Customer platform */}
                <Route element={<CustomerLayout />}>
                    <Route path="/" element={<Landing />} />
                    <Route path="/visa/:productId" element={<VisaDetail />} />
                    <Route path="/apply/:productId" element={<RequireCustomer><Apply /></RequireCustomer>} />
                    <Route path="/status/:caseId" element={<RequireCustomer><StatusTracker /></RequireCustomer>} />
                    <Route path="/account" element={<RequireCustomer><Account /></RequireCustomer>} />
                    <Route path="/auth" element={<AuthPage />} />
                </Route>

                {/* CRM (staff) */}
                <Route path="/crm/login" element={<CrmLogin />} />
                <Route element={<RequireStaff><CrmLayout /></RequireStaff>}>
                    <Route path="/crm" element={<CrmDashboard />} />
                    <Route path="/crm/pipeline" element={<Pipeline />} />
                    <Route path="/crm/cases/:caseId" element={<CaseDetail />} />
                    <Route path="/crm/offline-case" element={<OfflineCase />} />
                    <Route path="/crm/products" element={<RequireAdmin><Products /></RequireAdmin>} />
                    <Route path="/crm/products/:productId" element={<RequireAdmin><ProductBuilder /></RequireAdmin>} />
                    <Route path="/crm/consultants" element={<RequireAdmin><Consultants /></RequireAdmin>} />
                    <Route path="/crm/reports" element={<Reports />} />
                    <Route path="/crm/passport-expiry" element={<PassportExpiry />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
