import { Layout } from "./components/Layout";
import { AppProvider, useApp } from "./lib/context";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalysisPage } from "./pages/AnalysisPage";
import { GeneratePage } from "./pages/GeneratePage";
import { HomePage } from "./pages/HomePage";
import { SavedPage } from "./pages/SavedPage";

function Screen() {
  const { view } = useApp();
  return (
    <Layout>
      {view === "home" && <HomePage />}
      {view === "analysis" && <AnalysisPage />}
      {view === "generate" && <GeneratePage />}
      {view === "saved" && <SavedPage />}
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
