import Dashboard from "./Dashboard";
import { NoticeProvider } from "./Notice";

export default function App() {
  return (
    <NoticeProvider>
      <Dashboard />
    </NoticeProvider>
  );
}
