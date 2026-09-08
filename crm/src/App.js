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
import RoleMaster from "@/pages/crm/RoleMaster";
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
import { firstAllowedPath, userHasMenu } from "@/layouts/crmNavConfig";

function RequireStaff({ children }) {
    if (!isStaffSessionValid()) return <Navigate to="/login" replace />;
    return children;
}
function RequireMenu({ menuKey, children }) {
    const u = getUser();
    if (!u || !userHasMenu(u, menuKey)) return <Navigate to={firstAllowedPath(u)} replace />;
    return children;
}

export default function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-right" richColors />
            <Routes>
                <Route path="/login" element={<CrmLogin />} />
                <Route element={<RequireStaff><CrmLayout /></RequireStaff>}>
                    <Route path="/" element={<RequireMenu menuKey="dashboard"><CrmDashboard /></RequireMenu>} />
                    <Route path="/pipeline" element={<RequireMenu menuKey="pipeline"><Pipeline /></RequireMenu>} />
                    <Route path="/cases/closed" element={<RequireMenu menuKey="closed_cases"><ClosedCases /></RequireMenu>} />
                    <Route path="/tasks" element={<RequireMenu menuKey="tasks"><Tasks /></RequireMenu>} />
                    <Route path="/leads" element={<RequireMenu menuKey="leads"><Leads /></RequireMenu>} />
                    <Route path="/leads/analysis" element={<RequireMenu menuKey="lead_analytics"><LeadsAnalytics /></RequireMenu>} />
                    <Route path="/leads/new" element={<RequireMenu menuKey="leads"><LeadCreate /></RequireMenu>} />
                    <Route path="/clients" element={<RequireMenu menuKey="clients"><Clients /></RequireMenu>} />
                    <Route path="/clients/:customerId" element={<RequireMenu menuKey="clients"><ClientDetail /></RequireMenu>} />
                    <Route path="/follow-ups" element={<RequireMenu menuKey="follow_ups"><LeadFollowUps /></RequireMenu>} />
                    <Route path="/service-orders" element={<RequireMenu menuKey="service_orders"><ServiceOrders /></RequireMenu>} />
                    <Route path="/finance" element={<RequireMenu menuKey="finance"><Finance /></RequireMenu>} />
                    <Route path="/reports/payments" element={<RequireMenu menuKey="payment_reports"><PaymentsReport /></RequireMenu>} />
                    <Route path="/inbox" element={<RequireMenu menuKey="inbox"><Inbox /></RequireMenu>} />
                    <Route path="/cases/:caseId" element={<RequireMenu menuKey="pipeline"><CaseDetail /></RequireMenu>} />
                    <Route path="/offline-case" element={<RequireMenu menuKey="offline_case"><OfflineCase /></RequireMenu>} />
                    <Route path="/products" element={<RequireMenu menuKey="visa_products"><Products /></RequireMenu>} />
                    <Route path="/products/:productId" element={<RequireMenu menuKey="visa_products"><ProductBuilder /></RequireMenu>} />
                    <Route path="/passport-products" element={<RequireMenu menuKey="passport_products"><PassportProducts /></RequireMenu>} />
                    <Route path="/passport-products/:productId" element={<RequireMenu menuKey="passport_products"><PassportProductBuilder /></RequireMenu>} />
                    <Route path="/document-master" element={<RequireMenu menuKey="document_master"><DocumentMaster /></RequireMenu>} />
                    <Route path="/field-master" element={<RequireMenu menuKey="field_master"><FieldMaster /></RequireMenu>} />
                    <Route path="/consultants" element={<RequireMenu menuKey="user_master"><Consultants /></RequireMenu>} />
                    <Route path="/roles" element={<RequireMenu menuKey="role_master"><RoleMaster /></RequireMenu>} />
                    <Route path="/case-number-settings" element={<RequireMenu menuKey="case_numbers"><CaseNumberSettings /></RequireMenu>} />
                    <Route path="/reports" element={<RequireMenu menuKey="case_reports"><Reports /></RequireMenu>} />
                    <Route path="/passport-expiry" element={<RequireMenu menuKey="passport_expiry"><PassportExpiry /></RequireMenu>} />
                    <Route path="/birthdays" element={<RequireMenu menuKey="birthdays"><Birthdays /></RequireMenu>} />
                    <Route path="/profile" element={<StaffProfile />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
