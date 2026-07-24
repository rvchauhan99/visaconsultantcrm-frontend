import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import CustomerLayout from "@/layouts/CustomerLayout";
import Landing from "@/pages/customer/Landing";
import VisaDetail from "@/pages/customer/VisaDetail";
import Apply from "@/pages/customer/Apply";
import StatusTracker from "@/pages/customer/StatusTracker";
import Account from "@/pages/customer/Account";
import AuthPage from "@/pages/customer/AuthPage";

import { getUser } from "@/lib/api";

function RequireCustomer({ children }) {
    const u = getUser();
    if (!u || u.role !== "customer") return <Navigate to="/auth" replace />;
    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-right" richColors />
            <Routes>
                <Route element={<CustomerLayout />}>
                    <Route path="/" element={<Landing />} />
                    <Route path="/visa/:productId" element={<VisaDetail />} />
                    <Route path="/apply/:productId" element={<RequireCustomer><Apply /></RequireCustomer>} />
                    <Route path="/status/:caseId" element={<RequireCustomer><StatusTracker /></RequireCustomer>} />
                    <Route path="/account" element={<RequireCustomer><Account /></RequireCustomer>} />
                    <Route path="/auth" element={<AuthPage />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
