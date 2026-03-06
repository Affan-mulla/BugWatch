import { Outlet, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useAppStore } from "@/store/appStore";

export function WorkspaceLayout() {
  const { id } = useParams<{ id: string }>();
  const selectRepository = useAppStore((state) => state.selectRepository);

  useEffect(() => {
    if (id) {
      selectRepository(id);
    }
  }, [id, selectRepository]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar repositoryId={id} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
