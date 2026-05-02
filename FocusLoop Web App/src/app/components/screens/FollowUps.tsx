import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Chip } from "../ui/Chip";
import { Dialog } from "../ui/dialog";
import { PageSpinner } from "../ui/spinner";
import { api, FollowUpListItem } from "../../api/client";
import { Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";

export function FollowUps() {
  const navigate = useNavigate();
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [followupProject, setFollowupProject] = useState<string | null>(null);
  const [rescheduleFollowUpId, setRescheduleFollowUpId] = useState<string | null>(null);
  const [newReturnDate, setNewReturnDate] = useState("");
  const [items, setItems] = useState<FollowUpListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();

  const load = () => api.followUps().then((p) => setItems(p.items));
  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, []);

  const overdue = items.filter((i) => i.state === "overdue");
  const dueToday = items.filter((i) => i.state === "due_today");
  const upcoming = items.filter((i) => i.state === "upcoming");

  const getDaysOverdue = (returnAt: string) => {
    const returnDate = new Date(returnAt);
    return Math.floor((today.getTime() - returnDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatReturnDate = (returnAt: string) =>
    new Date(returnAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const reschedule = async () => {
    if (!rescheduleFollowUpId || !newReturnDate) return;
    await api.rescheduleFollowUp(rescheduleFollowUpId, new Date(newReturnDate).toISOString());
    setRescheduleFollowUpId(null);
    setNewReturnDate("");
    setLoading(true);
    void load().finally(() => setLoading(false));
  };

  const followUpDialogLabel =
    followupProject && items.find((i) => i.project_id === followupProject)?.waiting_on_label;

  return (
    <div className="max-w-3xl mx-auto p-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl mb-3">Follow-ups</h1>
        <p className="text-muted-foreground text-lg">
          Manage blocked projects while you wait on others
        </p>
      </div>

      {loading && <PageSpinner message="Loading follow-ups…" />}

      {/* Overdue Follow-ups */}
      {!loading && overdue.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-destructive" />
            <h2 className="text-2xl">Overdue</h2>
            <Chip variant="danger">{overdue.length}</Chip>
          </div>

          <div className="space-y-4">
            {overdue.map((item) => {
              const daysOverdue = getDaysOverdue(item.return_at);
              return (
                <Card key={item.id} className="border-l-4 border-l-destructive">
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl">{item.project_title}</h3>
                      <Chip variant="danger">Overdue {daysOverdue}d</Chip>
                    </div>

                    <p className="text-muted-foreground mb-2">{item.reason}</p>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Waiting on: {item.waiting_on_label}</span>
                      <span>•</span>
                      <span>Due: {formatReturnDate(item.return_at)}</span>
                    </div>

                    {item.suggested_action_text && (
                      <p className="text-sm mt-3 text-foreground">💡 {item.suggested_action_text}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary" onClick={() => setFollowupProject(item.project_id)}>
                      Send reminder
                    </Button>
                    <Button variant="outline" onClick={() => setRescheduleFollowUpId(item.id)}>
                      Reschedule
                    </Button>
                    <Button variant="ghost" onClick={() => navigate(`/projects/${item.project_id}`)}>
                      Open project
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Due Today / Returned Today */}
      {!loading && dueToday.length > 0 && (
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-warning" />
            <h2 className="text-2xl">Due today</h2>
            <Chip variant="warning">{dueToday.length}</Chip>
          </div>

          <div className="space-y-4">
            {dueToday.map((item) => (
              <Card key={item.id} className="border-l-4 border-l-warning">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl">{item.project_title}</h3>
                    <Chip variant="warning">Due today</Chip>
                  </div>

                  <p className="text-muted-foreground mb-2">{item.reason}</p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Waiting on: {item.waiting_on_label}</span>
                  </div>

                  {item.suggested_action_text && (
                    <p className="text-sm mt-3 text-foreground">💡 {item.suggested_action_text}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="primary" onClick={() => navigate(`/projects/${item.project_id}`)}>
                    Mark unblocked
                  </Button>
                  <Button variant="outline" onClick={() => setRescheduleFollowUpId(item.id)}>
                    Reschedule
                  </Button>
                  <Button variant="ghost" onClick={() => navigate(`/projects/${item.project_id}`)}>
                    Open project
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Follow-ups (Collapsed) */}
      {!loading && upcoming.length > 0 && (
        <div className="mb-12">
          <button
            onClick={() => setShowUpcoming(!showUpcoming)}
            className="flex items-center gap-3 mb-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showUpcoming ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            <span className="text-lg">
              {upcoming.length} upcoming follow-up{upcoming.length !== 1 ? "s" : ""}
            </span>
          </button>

          {showUpcoming && (
            <div className="space-y-4">
              {upcoming.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/projects/${item.project_id}`)}
                  hover
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg">{item.project_title}</h3>
                    <Chip variant="default">{formatReturnDate(item.return_at)}</Chip>
                  </div>

                  <p className="text-muted-foreground text-sm">Waiting on: {item.waiting_on_label}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
        <Card className="text-center py-16">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-2xl mb-3">No follow-ups</h3>
          <p className="text-muted-foreground text-lg">You have no blocked projects waiting on others</p>
        </Card>
      )}

      {/* Send Follow-up Dialog */}
      <Dialog open={followupProject !== null} onClose={() => setFollowupProject(null)} title="Send reminder">
        <div className="space-y-4">
          {followupProject && (
            <>
              <p className="text-muted-foreground mb-2">
                Send a reminder for {followUpDialogLabel}?
              </p>
              <p className="text-sm text-muted-foreground">
                This will log a follow-up and remind you to reach out again.
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    navigate(`/projects/${followupProject}`);
                    setFollowupProject(null);
                  }}
                >
                  Send reminder
                </Button>
                <Button variant="outline" onClick={() => setFollowupProject(null)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog
        open={rescheduleFollowUpId !== null}
        onClose={() => {
          setRescheduleFollowUpId(null);
          setNewReturnDate("");
        }}
        title="Reschedule follow-up"
      >
        <div className="space-y-4">
          {rescheduleFollowUpId && (
            <>
              <div>
                <label className="block text-sm mb-2 text-muted-foreground">New return date</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                  value={newReturnDate}
                  onChange={(e) => setNewReturnDate(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="primary" onClick={() => void reschedule()}>
                  Reschedule
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setRescheduleFollowUpId(null);
                    setNewReturnDate("");
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
