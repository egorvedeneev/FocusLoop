import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Chip } from "../ui/Chip";
import { Dialog } from "../ui/dialog";
import { PageSpinner } from "../ui/spinner";
import { api, FollowUpListItem, WeeklyReviewPayload } from "../../api/client";
import { Pause, AlertCircle, Clock, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useMemo, useState } from "react";

export function WeeklyReview() {
  const navigate = useNavigate();
  const [showMovedForward, setShowMovedForward] = useState(false);
  const [quickActionProject, setQuickActionProject] = useState<string | null>(null);
  const [newActionText, setNewActionText] = useState("");
  const [review, setReview] = useState<WeeklyReviewPayload | null>(null);
  const [followUpsWeek, setFollowUpsWeek] = useState<FollowUpListItem[]>([]);

  const weekFromNow = useMemo(() => {
    const t = new Date();
    return new Date(t.getTime() + 7 * 24 * 60 * 60 * 1000);
  }, []);

  useEffect(() => {
    setReview(null);
    setFollowUpsWeek([]);
    Promise.all([api.weeklyReview(), api.followUps()]).then(([rev, payload]) => {
      setReview(rev);
      const inWeek = payload.items.filter((i) => new Date(i.return_at) <= weekFromNow);
      setFollowUpsWeek(inWeek);
    });
  }, [weekFromNow]);

  const section = (type: string) => review?.sections.find((s) => s.type === type)?.items ?? [];
  const movedForward = section("moved_forward");
  const stillBlocked = section("still_blocked");
  const noMovement = section("no_movement");
  const missingNextAction = section("missing_next_action");
  const needsAttention = stillBlocked.length + noMovement.length + missingNextAction.length;

  const followUpsDueThisWeek = followUpsWeek;

  const quickActionTitle =
    quickActionProject && review
      ? [...section("missing_next_action")].find((p) => p.project_id === quickActionProject)?.project_title
      : null;

  const saveQuickAction = async () => {
    if (!quickActionProject || !newActionText.trim()) return;
    await api.setNextAction(quickActionProject, { title: newActionText.trim() });
    setQuickActionProject(null);
    setNewActionText("");
    api.weeklyReview().then(setReview);
  };

  if (!review) {
    return (
      <div className="max-w-3xl mx-auto p-12">
        <PageSpinner message="Loading weekly review…" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl mb-3">Weekly Review</h1>
        <p className="text-muted-foreground text-lg">
          Week of{" "}
          {new Date(review.week_start).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Summary */}
      <Card className="mb-12 p-8">
        <h2 className="text-xl mb-6 text-muted-foreground">Project momentum</h2>
        <div className="grid grid-cols-3 gap-8">
          <div>
            <div className="text-5xl text-success mb-2">{review.summary.moved_projects}</div>
            <div className="text-muted-foreground text-lg">Moved forward</div>
          </div>
          <div>
            <div className="text-5xl text-warning mb-2">{review.summary.blocked_projects}</div>
            <div className="text-muted-foreground text-lg">Blocked</div>
          </div>
          <div>
            <div className="text-5xl text-destructive mb-2">{needsAttention}</div>
            <div className="text-muted-foreground text-lg">Need attention</div>
          </div>
        </div>
      </Card>

      {/* Follow-ups Due This Week */}
      {followUpsDueThisWeek.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-warning" />
            <h2 className="text-2xl">Follow-ups due this week</h2>
            <Chip variant="warning">{followUpsDueThisWeek.length}</Chip>
          </div>

          <div className="space-y-4">
            {followUpsDueThisWeek.map((item) => (
              <Card key={item.id} className="border-l-4 border-l-warning">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl">{item.project_title}</h3>
                  <Chip variant="warning">
                    {new Date(item.return_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Chip>
                </div>
                <p className="text-muted-foreground mb-2">Waiting on: {item.waiting_on_label}</p>
                <Button variant="primary" onClick={() => navigate("/follow-ups")}>
                  View follow-ups
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Critical: Still Blocked */}
      {stillBlocked.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Pause className="w-6 h-6 text-destructive" />
            <h2 className="text-2xl">Still blocked</h2>
            <Chip variant="danger">{stillBlocked.length}</Chip>
          </div>

          <div className="space-y-4">
            {stillBlocked.map((project) => (
              <Card key={project.project_id} className="hover:shadow-lg transition-shadow">
                <h3 className="text-xl mb-3">{project.project_title}</h3>
                <div className="mb-6">
                  <p className="text-muted-foreground mb-2">{project.summary}</p>
                </div>
                <Button variant="primary" onClick={() => navigate(`/projects/${project.project_id}`)}>
                  Review
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Critical: No Movement */}
      {noMovement.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-warning" />
            <h2 className="text-2xl">No movement (7+ days)</h2>
            <Chip variant="warning">{noMovement.length}</Chip>
          </div>

          <div className="space-y-4">
            {noMovement.map((project) => (
              <Card key={project.project_id} className="hover:shadow-lg transition-shadow">
                <h3 className="text-xl mb-3">{project.project_title}</h3>
                <p className="text-muted-foreground mb-6">{project.summary}</p>
                <Button variant="primary" onClick={() => navigate(`/projects/${project.project_id}`)}>
                  Review
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Critical: Missing Next Action */}
      {missingNextAction.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h2 className="text-2xl">Missing next action</h2>
            <Chip variant="danger">{missingNextAction.length}</Chip>
          </div>

          <div className="space-y-4">
            {missingNextAction.map((project) => (
              <Card key={project.project_id} className="border-l-4 border-l-warning">
                <h3 className="text-xl mb-3">{project.project_title}</h3>
                <p className="text-muted-foreground mb-4">This project needs a next action to move forward.</p>
                <div className="flex gap-3">
                  <Button variant="primary" icon={<Plus />} onClick={() => setQuickActionProject(project.project_id)}>
                    Quick add
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/projects/${project.project_id}`)}>
                    Open project
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Moved Forward - Collapsed */}
      {movedForward.length > 0 && (
        <div className="mb-12">
          <button
            onClick={() => setShowMovedForward(!showMovedForward)}
            className="flex items-center gap-3 mb-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showMovedForward ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            <span className="text-lg">
              {movedForward.length} project{movedForward.length !== 1 ? "s" : ""} moved forward
            </span>
          </button>

          {showMovedForward && (
            <div className="space-y-4">
              {movedForward.map((project) => (
                <Card
                  key={project.project_id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/projects/${project.project_id}`)}
                  hover
                >
                  <h3 className="text-lg mb-2">{project.project_title}</h3>
                  <p className="text-muted-foreground">{project.summary}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Complete */}
      {needsAttention === 0 && (
        <Card className="text-center py-16">
          <h3 className="text-2xl mb-3">Review complete</h3>
          <p className="text-muted-foreground text-lg mb-8">All projects are in good shape.</p>
          <Button variant="primary" onClick={() => navigate("/")}>
            Back to Today
          </Button>
        </Card>
      )}

      {/* Quick Add Next Action Dialog */}
      <Dialog
        open={quickActionProject !== null}
        onClose={() => {
          setQuickActionProject(null);
          setNewActionText("");
        }}
        title="Add next action"
      >
        <div className="space-y-4">
          {quickActionProject && (
            <>
              <p className="text-sm text-muted-foreground">Project: {quickActionTitle}</p>
              <div>
                <label className="block text-sm mb-2 text-muted-foreground">Next action</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                  placeholder="What needs to be done?"
                  value={newActionText}
                  onChange={(e) => setNewActionText(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="primary" onClick={() => void saveQuickAction()}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuickActionProject(null);
                    setNewActionText("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  );
}
