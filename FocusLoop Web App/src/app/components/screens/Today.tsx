import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Chip } from "../ui/Chip";
import { PageSpinner } from "../ui/spinner";
import { api, TodaySection } from "../../api/client";
import { AlertCircle, Inbox, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";

export function Today() {
  const navigate = useNavigate();
  const [showRecommended, setShowRecommended] = useState(false);
  const [showStale, setShowStale] = useState(false);
  const [sections, setSections] = useState<TodaySection[]>([]);
  const [summary, setSummary] = useState({
    needs_attention_count: 0,
    overdue_follow_ups_count: 0,
    missing_next_action_count: 0,
    stale_projects_count: 0,
    new_inbox_count: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSections([]);
    setSummary({
      needs_attention_count: 0,
      overdue_follow_ups_count: 0,
      missing_next_action_count: 0,
      stale_projects_count: 0,
      new_inbox_count: 0,
    });
    api
      .today()
      .then((payload) => {
        setSections(payload.sections);
        setSummary(payload.summary);
      })
      .finally(() => setLoading(false));
  }, []);

  const section = (type: string) => sections.find((item) => item.type === type);
  const overdueFollowups = section("overdue_follow_ups")?.items ?? [];
  const returnedToday = section("returned_today")?.items ?? [];
  const noNextAction = section("missing_next_action")?.items ?? [];
  const staleProjects = section("stale_projects")?.items ?? [];
  const recommended = section("recommended_next_actions")?.items ?? [];
  const today = new Date();
  const criticalCount = summary.needs_attention_count;
  const unprocessedCount = summary.new_inbox_count;

  return (
    <div className="max-w-3xl mx-auto p-12">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-baseline justify-between mb-3">
          <h1 className="text-4xl">Today</h1>
          {criticalCount > 0 && (
            <Chip variant="danger">
              {criticalCount === 1 ? "1 item needs attention" : `${criticalCount} items need attention`}
            </Chip>
          )}
        </div>
        <p className="text-muted-foreground text-lg">
          {today.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {loading && <PageSpinner message="Loading Today…" className="mb-12" />}

      {/* Inbox Alert */}
      {!loading && unprocessedCount > 0 && (
        <Card className="mb-8 border-l-4 border-l-primary cursor-pointer" onClick={() => navigate("/inbox")} hover>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Inbox className="w-7 h-7 text-primary" />
              <div>
                <h3 className="text-xl">Inbox needs attention</h3>
                <p className="text-muted-foreground mt-1">
                  {unprocessedCount === 1 ? "1 unprocessed item" : `${unprocessedCount} unprocessed items`}
                </p>
              </div>
            </div>
            <span className="text-primary font-medium">Process →</span>
          </div>
        </Card>
      )}

      {/* Overdue Follow-ups */}
      {!loading && overdueFollowups.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h2 className="text-2xl">Overdue follow-ups</h2>
            <Chip variant="danger">{overdueFollowups.length}</Chip>
          </div>

          <div className="space-y-4">
            {overdueFollowups.map((project) => (
              <Card key={project.project_id} className="border-l-4 border-l-destructive">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl">{project.project_title}</h3>
                  <Chip variant="danger">{project.reason_label ?? "Overdue follow-up"}</Chip>
                </div>

                <p className="text-muted-foreground mb-2">This follow-up is overdue — double-check what you are waiting on.</p>

                <p className="text-sm text-muted-foreground mb-4">
                  {project.action_title ? (
                    <>Waiting on / next step: {project.action_title}</>
                  ) : (
                    <>Open the project or the Follow-ups tab to continue.</>
                  )}
                </p>

                <Button variant="primary" onClick={() => navigate(`/follow-ups`)}>
                  Send reminder
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Returned Today */}
      {!loading && returnedToday.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-warning" />
            <h2 className="text-2xl">Due back today</h2>
            <Chip variant="warning">{returnedToday.length}</Chip>
          </div>

          <div className="space-y-4">
            {returnedToday.map((project) => (
              <Card key={project.project_id} className="border-l-4 border-l-warning">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl">{project.project_title}</h3>
                  <Chip variant="warning">Due today</Chip>
                </div>

                <p className="text-muted-foreground mb-2">Return date is today — check if you can unblock this project.</p>

                <p className="text-sm text-muted-foreground mb-4">
                  {project.action_title ? <>Next: {project.action_title}</> : null}
                </p>

                <Button variant="primary" onClick={() => navigate(`/projects/${project.project_id}`)}>
                  Review unblock
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Next Action */}
      {!loading && noNextAction.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h2 className="text-2xl">Missing next action</h2>
            <Chip variant="danger">{noNextAction.length}</Chip>
          </div>

          <div className="space-y-4">
            {noNextAction.map((project) => (
              <Card key={project.project_id} className="border-l-4 border-l-warning">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl">{project.project_title}</h3>
                  <Chip variant="danger">No next action</Chip>
                </div>

                <p className="text-muted-foreground mb-4">This project needs a next action to move forward.</p>

                <Button variant="primary" onClick={() => navigate(`/projects/${project.project_id}`)}>
                  Add action
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stale Projects (Collapsed by default) */}
      {!loading && staleProjects.length > 0 && (
        <div className="mb-12">
          <button
            onClick={() => setShowStale(!showStale)}
            className="flex items-center gap-3 mb-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showStale ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            <span className="text-lg">
              {staleProjects.length} stale project{staleProjects.length !== 1 ? "s" : ""}
            </span>
          </button>

          {showStale && (
            <div className="space-y-4">
              {staleProjects.map((project) => (
                <Card
                  key={project.project_id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/projects/${project.project_id}`)}
                  hover
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg">{project.project_title}</h3>
                    <Chip variant="warning">{project.reason_label ?? "No movement"}</Chip>
                  </div>
                  {project.action_title && (
                    <p className="text-muted-foreground text-sm">Next: {project.action_title}</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Caught Up */}
      {!loading && criticalCount === 0 && (
        <Card className="text-center py-16 mb-12">
          <h3 className="text-2xl mb-3">You&apos;re all caught up</h3>
          <p className="text-muted-foreground text-lg">No critical items need attention right now.</p>
        </Card>
      )}

      {/* Recommended (Collapsed by default) */}
      {!loading && recommended.length > 0 && (
        <div>
          <button
            onClick={() => setShowRecommended(!showRecommended)}
            className="flex items-center gap-3 mb-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showRecommended ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            <span className="text-lg">{recommended.length} ready to work on</span>
          </button>

          {showRecommended && (
            <div className="space-y-4">
              {recommended.map((project) => (
                <Card
                  key={project.project_id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/projects/${project.project_id}`)}
                  hover
                >
                  <h3 className="text-lg mb-2">{project.project_title}</h3>
                  {project.action_title && <p className="text-muted-foreground">Next: {project.action_title}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
