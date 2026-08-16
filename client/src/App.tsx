import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Hub } from "./pages/Hub";
import { ProjectZero } from "./pages/ProjectZero";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Hub />} />
        <Route path="project-zero" element={<ProjectZero />} />
      </Route>
    </Routes>
  );
}

export default App;
