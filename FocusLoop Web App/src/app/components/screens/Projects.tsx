import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { PageSpinner } from "../ui/spinner";
import { Chip } from "../ui/Chip";
import { SegmentedControl } from "../ui/SegmentedControl";
import { api, ProjectListItem } from "../../api/client";
import { Search, Circle, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";

export function Projects() {
  const [filter, setFilter] = useState<string>("active");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [projectRows, setProjectRows] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setProjectRows([]);
    api
      .projects(filter as "active" | "blocked" | "done")
      .then((payload) => setProjectRows(payload.items))
      .finally(() => setLoading(false));
  }, [filter]);

  const filteredProjects = projectRows.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-4xl mx-auto p-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl mb-8">Projects</h1>

        <div className="flex items-center gap-4 mb-6">
          <SegmentedControl
            options={[
              { value: "active", label: "Active" },
              { value: "blocked", label: "Blocked" },
              { value: "done", label: "Done" },
            ]}
            value={filter}
            onChange={setFilter}
          />
          
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="ml-auto p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Search (Progressive disclosure) */}
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              className="w-full pl-12 pr-4 py-3 bg-card rounded-2xl border border-border focus:border-primary focus:outline-none transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Empty State */}
      {loading && <PageSpinner message="Loading projects…" />}

      {!loading && filteredProjects.length === 0 && (
        <Card className="text-center py-16">
          <h3 className="text-xl mb-2">No projects found</h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search"
              : `No ${filter === 'active' ? 'active' : filter === 'blocked' ? 'blocked' : 'done'} projects`}
          </p>
        </Card>
      )}

      {/* Projects List */}
      {!loading && (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const isActive = project.status === "active";
            const isBlocked = project.status === "blocked";
            const isDone = project.status === "done";
            const formatDate = (date: Date) =>
              date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            const lastActivity = new Date(project.last_activity_at);
            const isOverdue = project.attention_state === "overdue_follow_up";
            const isStale = project.attention_state === "stale_project";
            const nextTitle = project.current_next_action?.title;

            return (
              <Card
                key={project.id}
                className={`cursor-pointer hover:shadow-lg transition-shadow ${
                  isOverdue ? "border-l-4 border-l-destructive" : ""
                }`}
                onClick={() => navigate(`/projects/${project.id}`)}
                hover
              >
                <div className="flex items-start gap-4">
                  {/* Status Indicator */}
                  <div className="mt-1">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-success" />
                    ) : (
                      <Circle className={`w-5 h-5 ${isBlocked ? "text-warning" : "text-primary"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl">{project.title}</h3>
                      <div className="flex gap-2 ml-4">
                        {isBlocked && (
                          <Chip variant="warning" icon={<Clock className="w-3 h-3" />}>
                            Blocked
                          </Chip>
                        )}
                        {isDone && (
                          <Chip variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                            Done
                          </Chip>
                        )}
                        {!nextTitle && isActive && (
                          <Chip variant="danger" icon={<AlertCircle className="w-3 h-3" />}>
                            No action
                          </Chip>
                        )}
                        {isStale && isActive && <Chip variant="warning">Stale</Chip>}
                      </div>
                    </div>

                    {nextTitle && (
                      <p className="text-muted-foreground mb-2">Next: {nextTitle}</p>
                    )}

                    {!nextTitle && isActive && (
                      <p className="text-destructive mb-2">No next action set</p>
                    )}

                    {isBlocked && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          {isOverdue
                            ? "Overdue follow-up — open the project for details"
                            : "Blocked project — check the return date on the card"}
                        </p>
                      </div>
                    )}

                    {!isBlocked && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Last activity: {formatDate(lastActivity)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
