import React, { useState } from 'react';
import { useErp } from './store/erpContext';
import { canRoleAccess } from './config/navigation';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { AccessDenied } from './components/common/AccessDenied';
import { AppSwitcherModal } from './components/common/AppSwitcherModal';
import { ScenarioTestRunnerModal } from './components/common/ScenarioTestRunnerModal';

// Pages S-01 to S-18 + Login
import { LoginPage } from './pages/LoginPage';
import { HomeDashboardPage } from './pages/HomeDashboardPage';
import { ContactCustomerPage } from './pages/ContactCustomerPage';
import { ProductCatalogPage } from './pages/ProductCatalogPage';
import { CrmPipelinePage } from './pages/CrmPipelinePage';
import { QuotationSalesOrderPage } from './pages/QuotationSalesOrderPage';
import { ReservationCreditGatePage } from './pages/ReservationCreditGatePage';
import { DeliveryOrderPage } from './pages/DeliveryOrderPage';
import { CustomerInvoicePage } from './pages/CustomerInvoicePage';
import { PurchaseOrderPage } from './pages/PurchaseOrderPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { QualityCheckPage } from './pages/QualityCheckPage';
import { VendorBillPage } from './pages/VendorBillPage';
import { JournalEntriesPage } from './pages/JournalEntriesPage';
import { RegisterPaymentDialog } from './pages/RegisterPaymentDialog';
import { InternalTransferPage } from './pages/InternalTransferPage';
import { ReturnCreditNotePage } from './pages/ReturnCreditNotePage';
import { KpiDashboardPage } from './pages/KpiDashboardPage';
import { AuditLogPage } from './pages/AuditLogPage';

export const AppContent: React.FC = () => {
  const { currentUser } = useErp();
  const [currentScreenId, setCurrentScreenId] = useState<string>('S-01');
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [appSwitcherOpen, setAppSwitcherOpen] = useState(false);
  const [testRunnerOpen, setTestRunnerOpen] = useState(false);

  // If user is logged out, show Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={() => setCurrentScreenId('S-01')} />;
  }

  // RBAC Permission Check (SR-16 / T-02)
  const isAllowed = canRoleAccess(currentUser.role, currentScreenId);

  const renderActiveScreen = () => {
    if (!isAllowed) {
      return (
        <AccessDenied
          requiredModule={`Layar ${currentScreenId}`}
          onNavigateHome={() => setCurrentScreenId('S-01')}
        />
      );
    }

    switch (currentScreenId) {
      case 'S-01':
        return <HomeDashboardPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-02':
        return <ContactCustomerPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-03':
        return <ProductCatalogPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-04':
        return <CrmPipelinePage onNavigateScreen={setCurrentScreenId} />;
      case 'S-05':
        return <QuotationSalesOrderPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-06':
        return <ReservationCreditGatePage onNavigateScreen={setCurrentScreenId} />;
      case 'S-07':
        return <DeliveryOrderPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-08':
        return <CustomerInvoicePage onNavigateScreen={setCurrentScreenId} />;
      case 'S-09':
        return <PurchaseOrderPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-10':
        return <ReceiptPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-11':
        return <QualityCheckPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-12':
        return <VendorBillPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-13':
        return <JournalEntriesPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-14':
        return <RegisterPaymentDialog onNavigateScreen={setCurrentScreenId} />;
      case 'S-15':
        return <InternalTransferPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-16':
        return <ReturnCreditNotePage onNavigateScreen={setCurrentScreenId} />;
      case 'S-17':
        return <KpiDashboardPage onNavigateScreen={setCurrentScreenId} />;
      case 'S-18':
        return <AuditLogPage onNavigateScreen={setCurrentScreenId} />;
      default:
        return <HomeDashboardPage onNavigateScreen={setCurrentScreenId} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        currentScreenId={currentScreenId}
        onNavigateScreen={setCurrentScreenId}
        onOpenTestRunner={() => setTestRunnerOpen(true)}
        onToggleAppSwitcher={() => setAppSwitcherOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Dynamic Sidebar */}
        <Sidebar
          currentScreenId={currentScreenId}
          onNavigateScreen={setCurrentScreenId}
          isOpen={sidebarMobileOpen}
          onCloseMobile={() => setSidebarMobileOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          {renderActiveScreen()}
        </main>
      </div>

      {/* App Switcher Modal (▦ Apps) */}
      <AppSwitcherModal
        isOpen={appSwitcherOpen}
        onClose={() => setAppSwitcherOpen(false)}
        onSelectScreen={screenId => setCurrentScreenId(screenId)}
      />

      {/* 36 Scenario Test Runner Modal */}
      <ScenarioTestRunnerModal
        isOpen={testRunnerOpen}
        onClose={() => setTestRunnerOpen(false)}
        onNavigateScreen={screenId => setCurrentScreenId(screenId)}
      />
    </div>
  );
};
