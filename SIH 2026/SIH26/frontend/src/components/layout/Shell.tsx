import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function Shell() {
  return (
    <div className="flex h-screen overflow-hidden bg-navy-950 grid-bg bg-grid">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
