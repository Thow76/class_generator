import Sidebar from "./Sidebar.jsx";

export default function AppShell({
  stages,
  currentStage,
  completedStages,
  onStageChange,
  apiStatus,
  projectControls,
  children
}) {
  return (
    <div className="app-shell">
      <Sidebar
        stages={stages}
        currentStage={currentStage}
        completedStages={completedStages}
        onStageChange={onStageChange}
        apiStatus={apiStatus}
        projectControls={projectControls}
      />
      <main className="main-content">{children}</main>
    </div>
  );
}
