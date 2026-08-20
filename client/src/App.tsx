/**
 * Quiet Index style reminder: Study Track uses an editorial, local-first study ledger;
 * keep the global shell uncluttered so the rail-and-ledger interface carries the hierarchy.
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import Home from "./pages/Home";

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster richColors position="bottom-right" />
        <Home />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
