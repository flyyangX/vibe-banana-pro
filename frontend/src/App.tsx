import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home/index';
import { History } from './pages/History/index';
import { OutlineEditor } from './pages/OutlineEditor/index';
import { DetailEditor } from './pages/DetailEditor/index';
import { SlidePreview } from './pages/SlidePreview/index';
import { InfographicPreview } from './pages/InfographicPreview/index';
import { XhsPreview } from './pages/XhsPreview/index';
import { ProjectMaterials } from './pages/ProjectMaterials/index';
import { SettingsPage } from './pages/Settings/index';
import { useProjectStore } from './store/useProjectStore';
import { useToast } from './components/shared';

function App() {
  const { currentProject, syncProject, error, setError } = useProjectStore();
  const { show, ToastContainer } = useToast();

  // 恢复项目状态
  useEffect(() => {
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId && !currentProject) {
      syncProject();
    }
  }, [currentProject, syncProject]);

  // 显示全局错误
  useEffect(() => {
    if (error) {
      show({ message: error, type: 'error' });
      setError(null);
    }
  }, [error, setError, show]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/project/:projectId/outline" element={<OutlineEditor />} />
        <Route path="/project/:projectId/detail" element={<DetailEditor />} />
        <Route path="/project/:projectId/preview" element={<SlidePreview />} />
        <Route path="/project/:projectId/infographic" element={<InfographicPreview />} />
        <Route path="/project/:projectId/xhs" element={<XhsPreview />} />
        <Route path="/project/:projectId/materials" element={<ProjectMaterials />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;

