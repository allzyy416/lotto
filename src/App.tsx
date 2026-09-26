import { Layout } from "./components/Layout";
import { AppProvider, useApp } from "./lib/context";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { GeneratePage } from "./pages/GeneratePage";
import { HomePage } from "./pages/HomePage";
import { PensionAnalysisPage } from "./pages/PensionAnalysisPage";
import { PensionGeneratePage } from "./pages/PensionGeneratePage";
import { PensionHomePage } from "./pages/PensionHomePage";
import { PensionSavedPage } from "./pages/PensionSavedPage";
import { SavedPage } from "./pages/SavedPage";

function Screen() {
  const { view, gameKind } = useApp();
  const pension = gameKind === "pension";
  return (
    <Layout>
      {view === "home" && (pension ? <PensionHomePage /> : <HomePage />)}
      {view === "analysis" && (pension ? <PensionAnalysisPage /> : <AnalysisPage />)}
      {view === "generate" && (pension ? <PensionGeneratePage /> : <GeneratePage />)}
      {view === "saved" && (pension ? <PensionSavedPage /> : <SavedPage />)}
      {view === "alerts" && <AlertsPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Screen />
    </AppProvider>
  );
}
