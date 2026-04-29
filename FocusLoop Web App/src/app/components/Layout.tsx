import { Outlet, NavLink, useNavigate } from "react-router";
import { Home, Inbox, FolderKanban, Clock, BookOpen, RotateCcw, Search, Plus } from "lucide-react";
import { useState } from "react";

export function Layout() {
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const navItems = [
    { to: "/", icon: Home, label: "Today" },
    { to: "/inbox", icon: Inbox, label: "Inbox" },
    { to: "/projects", icon: FolderKanban, label: "Projects" },
    { to: "/follow-ups", icon: Clock, label: "Follow-ups" },
    { to: "/reference", icon: BookOpen, label: "Reference" },
    { to: "/review", icon: RotateCcw, label: "Review" },
  ];

  const handleQuickCapture = () => {
    navigate("/inbox");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar Navigation */}
      <nav className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-xl text-primary mb-4">FocusLoop</h1>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent hover:bg-accent transition-colors"
              title="Search"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Search</span>
            </button>
            <button
              onClick={handleQuickCapture}
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              title="Quick capture"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-3 pt-3 pb-2 border-b border-sidebar-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects, actions..."
                className="w-full pl-9 pr-3 py-2 bg-sidebar-accent rounded-lg border border-border focus:border-primary focus:outline-none transition-colors text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}

        <div className="flex-1 px-3 pt-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-full mb-1 transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="p-4 text-sm text-muted-foreground border-t border-sidebar-border">
          <p>Capture → Clarify → Do → Review</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
