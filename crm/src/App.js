import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import CrmLayout from "@/layouts/CrmLayout";
import CrmLogin from "@/pages/crm/CrmLogin";
import CrmDashboard from "@/pages/crm/CrmDashboard";
import Pipeline from "@/pages/crm/Pipeline";
import CaseDetail from "@/pages/crm/CaseDetail";
import Tasks from "@/pages/crm/Tasks";
import Products from "@/pages/crm/Products";
import ProductBuilder from "@/pages/crm/ProductBuilder";
import Consultants from "@/pages/crm/Consultants";
import Reports from "@/pages/crm/Reports";
import OfflineCase from "@/pages/crm/OfflineCase";
import PassportExpiry from "@/pages/crm/PassportExpiry";
import Birthdays from "@/pages/crm/Birthdays";
import Clients from "@/pages/crm/Clients";
import ClientDetail from "@/pages/crm/ClientDetail";
import DocumentMaster from "@/pages/crm/DocumentMaster";
import FieldMaster from "@/pages/crm/FieldMaster";
import StaffProfile from "@/pages/crm/StaffProfile";
import Leads from "@/pages/crm/Leads";
import LeadsAnalytics from "@/pages/crm/LeadsAnalytics";
import LeadCreate from "@/pages/crm/LeadCreate";
import LeadFollowUps from "@/pages/crm/LeadFollowUps";
import ServiceOrders from "@/pages/crm/ServiceOrders";
import PassportProducts from "@/pages/crm/PassportProducts";
import PassportProductBuilder from "@/pages/crm/PassportProductBuilder";
import Finance from "@/pages/crm/Finance";
import Inbox from "@/pages/crm/Inbox";
import CaseNumberSettings from "@/pages/crm/CaseNumberSettings";
import ClosedCases from "@/pages/crm/ClosedCases";
import PaymentsReport from "@/pages/crm/PaymentsReport";

import { getUser, isStaffSessionValid } from "@/lib/api";

function RequireStaff({ children }) {
    if (!isStaffSessionValid()) return <Navigate to="/login" replace />;
    return children;
}
function RequireAdmin({ children }) {
    const u = getUser();
    if (!u || u.role !== "admin") return <Navigate to="/" replace />;
    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-right" richColors />
            <Routes>
                <Route path="/login" element={<CrmLogin />} />
                <Route element={<RequireStaff><CrmLayout /></RequireStaff>}>
                    <Route path="/" element={<CrmDashboard />} />
                    <Route path="/pipeline" element={<Pipeline />} />
                    <Route path="/cases/closed" element={<ClosedCases />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/leads" element={<Leads />} />
                    <Route path="/leads/analysis" element={<LeadsAnalytics />} />
                    <Route path="/leads/new" element={<LeadCreate />} />
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/clients/:customerId" element={<ClientDetail />} />
                    <Route path="/follow-ups" element={<LeadFollowUps />} />
                    <Route path="/service-orders" element={<ServiceOrders />} />
                    <Route path="/finance" element={<Finance />} />
                    <Route path="/reports/payments" element={<PaymentsReport />} />
                    <Route path="/inbox" element={<Inbox />} />
                    <Route path="/cases/:caseId" element={<CaseDetail />} />
                    <Route path="/offline-case" element={<OfflineCase />} />
                    <Route path="/products" element={<RequireAdmin><Products /></RequireAdmin>} />
                    <Route path="/products/:productId" element={<RequireAdmin><ProductBuilder /></RequireAdmin>} />
                    <Route path="/passport-products" element={<RequireAdmin><PassportProducts /></RequireAdmin>} />
                    <Route path="/passport-products/:productId" element={<RequireAdmin><PassportProductBuilder /></RequireAdmin>} />
                    <Route path="/document-master" element={<RequireAdmin><DocumentMaster /></RequireAdmin>} />
                    <Route path="/field-master" element={<RequireAdmin><FieldMaster /></RequireAdmin>} />
                    <Route path="/consultants" element={<RequireAdmin><Consultants /></RequireAdmin>} />
                    <Route path="/case-number-settings" element={<RequireAdmin><CaseNumberSettings /></RequireAdmin>} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/passport-expiry" element={<PassportExpiry />} />
                    <Route path="/birthdays" element={<Birthdays />} />
                    <Route path="/profile" element={<StaffProfile />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
