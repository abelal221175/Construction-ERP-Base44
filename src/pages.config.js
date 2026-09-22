import AuditLogs from './pages/AuditLogs';
import BOQ from './pages/BOQ';
import BankAccounts from './pages/BankAccounts';
import BusinessPartners from './pages/BusinessPartners';
import ChartOfAccounts from './pages/ChartOfAccounts';
import ClientIPC from './pages/ClientIPC';
import Companies from './pages/Companies';
import CostCenters from './pages/CostCenters';
import CostElementTypes from './pages/CostElementTypes';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Employees from './pages/Employees';
import Equipment from './pages/Equipment';
import FiscalPeriods from './pages/FiscalPeriods';
import FiscalYears from './pages/FiscalYears';
import GoodsReceived from './pages/GoodsReceived';
import Home from './pages/Home';
import ImportExportLogs from './pages/ImportExportLogs';
import IndirectCosts from './pages/IndirectCosts';
import JournalEntries from './pages/JournalEntries';
import LettersOfGuarantee from './pages/LettersOfGuarantee';
import NumberingSeries from './pages/NumberingSeries';
import PaymentVouchers from './pages/PaymentVouchers';
import PendingApprovals from './pages/PendingApprovals';
import Products from './pages/Products';
import ProjectBudget from './pages/ProjectBudget';
import ProjectDetails from './pages/ProjectDetails';
import Projects from './pages/Projects';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseRequisitions from './pages/PurchaseRequisitions';
import RFQList from './pages/RFQList';
import ReceiptVouchers from './pages/ReceiptVouchers';
import Reports from './pages/Reports';
import RolesPermissions from './pages/RolesPermissions';
import SubcontractorIPC from './pages/SubcontractorIPC';
import SubcontractorPayments from './pages/SubcontractorPayments';
import Subcontracts from './pages/Subcontracts';
import SystemModules from './pages/SystemModules';
import SystemSequences from './pages/SystemSequences';
import SystemSettings from './pages/SystemSettings';
import TenderDetails from './pages/TenderDetails';
import Tenders from './pages/Tenders';
import UnitsOfMeasure from './pages/UnitsOfMeasure';
import UserManagement from './pages/UserManagement';
import Users from './pages/Users';
import VariationOrders from './pages/VariationOrders';
import Warehouses from './pages/Warehouses';
import WorkflowSetup from './pages/WorkflowSetup';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AuditLogs": AuditLogs,
    "BOQ": BOQ,
    "BankAccounts": BankAccounts,
    "BusinessPartners": BusinessPartners,
    "ChartOfAccounts": ChartOfAccounts,
    "ClientIPC": ClientIPC,
    "Companies": Companies,
    "CostCenters": CostCenters,
    "CostElementTypes": CostElementTypes,
    "Dashboard": Dashboard,
    "Departments": Departments,
    "Employees": Employees,
    "Equipment": Equipment,
    "FiscalPeriods": FiscalPeriods,
    "FiscalYears": FiscalYears,
    "GoodsReceived": GoodsReceived,
    "Home": Home,
    "ImportExportLogs": ImportExportLogs,
    "IndirectCosts": IndirectCosts,
    "JournalEntries": JournalEntries,
    "LettersOfGuarantee": LettersOfGuarantee,
    "NumberingSeries": NumberingSeries,
    "PaymentVouchers": PaymentVouchers,
    "PendingApprovals": PendingApprovals,
    "Products": Products,
    "ProjectBudget": ProjectBudget,
    "ProjectDetails": ProjectDetails,
    "Projects": Projects,
    "PurchaseOrders": PurchaseOrders,
    "PurchaseRequisitions": PurchaseRequisitions,
    "RFQList": RFQList,
    "ReceiptVouchers": ReceiptVouchers,
    "Reports": Reports,
    "RolesPermissions": RolesPermissions,
    "SubcontractorIPC": SubcontractorIPC,
    "SubcontractorPayments": SubcontractorPayments,
    "Subcontracts": Subcontracts,
    "SystemModules": SystemModules,
    "SystemSequences": SystemSequences,
    "SystemSettings": SystemSettings,
    "TenderDetails": TenderDetails,
    "Tenders": Tenders,
    "UnitsOfMeasure": UnitsOfMeasure,
    "UserManagement": UserManagement,
    "Users": Users,
    "VariationOrders": VariationOrders,
    "Warehouses": Warehouses,
    "WorkflowSetup": WorkflowSetup,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};