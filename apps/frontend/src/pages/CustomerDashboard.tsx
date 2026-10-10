import { CustomerQuotesPanel } from "@/components/CustomerQuotesPanel";
import { useCustomerDashboard } from "./customer-dashboard/hooks";
import { CustomerDashboardLayout } from "./customer-dashboard/layout";
import { OverviewTab } from "./customer-dashboard/overview-tab";
import { ProfileTab } from "./customer-dashboard/profile-tab";
import { SecurityTab } from "./customer-dashboard/security-tab";
import { OrdersTab } from "./customer-dashboard/orders-tab";

const CustomerDashboard = () => {
  const dashboard = useCustomerDashboard();

  const {
    user,
    activeTab,
    quotes,
    draftQuotes,
    submittedQuotes,
    inReviewQuotes,
    respondedQuotes,
    selectedQuote,
    editorState,
    setEditorState,
    editorCardRef,
    quotesLoading,
    createDraftMutation,
    createDraftPending,
    saveDraftPending,
    submitPending,
    handleSelectQuote,
    handleSaveDraft,
    handleSaveAndSend,
    handleTabChange,
    provisionalCredentials,
    passwordForm,
    setPasswordForm,
    changePasswordMutation,
  } = dashboard;

  return (
    <CustomerDashboardLayout {...dashboard}>
      {activeTab === "orders" ? <OrdersTab /> : null}
      {activeTab === "overview" ? (
        <OverviewTab
          user={user}
          quotes={quotes}
          draftQuotes={draftQuotes}
          submittedQuotes={submittedQuotes}
          inReviewQuotes={inReviewQuotes}
          respondedQuotes={respondedQuotes}
          onTabChange={handleTabChange}
          onResumeQuote={handleSelectQuote}
        />
      ) : null}

      {activeTab === "quotes" ? (
        <CustomerQuotesPanel
          quotes={quotes}
          quotesLoading={quotesLoading}
          selectedQuote={selectedQuote}
          editorState={editorState}
          setEditorState={setEditorState}
          editorCardRef={editorCardRef}
          createDraftPending={createDraftPending}
          saveDraftPending={saveDraftPending}
          submitPending={submitPending}
          onCaptureDocument={async (selection) => {
            await createDraftMutation.mutateAsync({
              file: selection.file,
              width: selection.width,
              height: selection.height,
            });
          }}
          onSelectQuote={handleSelectQuote}
          onSaveDraft={handleSaveDraft}
          onSaveAndSend={handleSaveAndSend}
        />
      ) : null}

      {activeTab === "profile" || activeTab === "security" ? (
        <div className="dashboard-account-tabs" aria-label="Minha conta">
          <button
            type="button"
            aria-pressed={activeTab === "profile"}
            onClick={() => handleTabChange("profile")}
          >
            Dados pessoais
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "security"}
            onClick={() => handleTabChange("security")}
          >
            Senha e acesso
          </button>
        </div>
      ) : null}
      {activeTab === "profile" ? (
        <ProfileTab user={user} quotes={quotes} draftQuotes={draftQuotes} />
      ) : null}

      {activeTab === "security" ? (
        <SecurityTab
          user={user}
          provisionalCredentials={provisionalCredentials}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          changePasswordPending={changePasswordMutation.isPending}
          onChangePassword={() =>
            void changePasswordMutation.mutateAsync(passwordForm)
          }
        />
      ) : null}
    </CustomerDashboardLayout>
  );
};

export default CustomerDashboard;
