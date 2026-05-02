import { useParams, useNavigate } from "react-router";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Chip } from "../ui/Chip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { PageSpinner } from "../ui/spinner";
import { api, ProjectDetail } from "../../api/client";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Pause,
  MoreHorizontal,
  User,
  Users,
  Server,
  FileText,
} from "lucide-react";
import { useEffect, useState } from "react";

export function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  const [showMarkDone, setShowMarkDone] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);
  const [showUnblock, setShowUnblock] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showSendFollowup, setShowSendFollowup] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [newActionText, setNewActionText] = useState("");
  const [newActionDate, setNewActionDate] = useState("");
  const [newReturnDate, setNewReturnDate] = useState("");

  const loadProject = () => {
    if (!id) return;
    setProject(null);
    setLoading(true);
    api
      .project(id)
      .then(setProject)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProject();
  }, [id]);

  const saveNextAction = async () => {
    if (!id || !newActionText.trim()) return;
    try {
      await api.setNextAction(id, {
        title: newActionText.trim(),
        due_at: newActionDate ? new Date(newActionDate).toISOString() : null,
      });
      setNewActionText("");
      setNewActionDate("");
      setShowAddAction(false);
      loadProject();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not save next action");
    }
  };

  const completeCurrentAction = async () => {
    if (!project?.current_next_action) return;
    try {
      await api.completeAction(project.current_next_action.id);
      if (newActionText.trim()) {
        await api.setNextAction(project.id, { title: newActionText.trim() });
      }
      setNewActionText("");
      setShowMarkDone(false);
      loadProject();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not complete action");
    }
  };

  const unblockProjectSubmit = async () => {
    if (!project || !newActionText.trim()) return;
    try {
      await api.unblockProject(project.id, newActionText.trim());
      setNewActionText("");
      setShowUnblock(false);
      loadProject();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not unblock project");
    }
  };

  const rescheduleFollowUp = async () => {
    if (!project?.follow_up || !newReturnDate) return;
    try {
      await api.rescheduleFollowUp(project.follow_up.id, new Date(newReturnDate).toISOString());
      setNewReturnDate("");
      setShowReschedule(false);
      loadProject();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not reschedule");
    }
  };

  const confirmDeleteProject = async () => {
    if (!id) return;
    try {
      await api.deleteProject(id);
      setShowDeleteConfirm(false);
      navigate("/projects");
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : "Could not delete project");
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const eventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      project_created: "Project created",
      project_updated: "Project updated",
      next_action_set: "Next action set",
      next_action_completed: "Next action completed",
      project_blocked: "Project blocked",
      project_unblocked: "Project unblocked",
      follow_up_rescheduled: "Follow-up rescheduled",
      reference_linked: "Reference linked",
    };
    return labels[eventType] ?? eventType.replaceAll("_", " ");
  };

  const getReferenceIcon = (type: string) => {
    switch (type) {
      case "person":
        return User;
      case "team":
        return Users;
      case "service":
        return Server;
      case "document":
        return FileText;
      default:
        return FileText;
    }
  };

  const getReferenceChipVariant = (type: string): "default" | "primary" | "success" | "warning" => {
    switch (type) {
      case "person":
        return "primary";
      case "team":
        return "success";
      case "service":
        return "warning";
      case "document":
        return "default";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-12">
        <PageSpinner message="Loading project…" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto p-12">
        <Card className="text-center py-16">
          <h3 className="text-xl mb-4">Project not found</h3>
          <Button variant="primary" onClick={() => navigate("/projects")}>
            Back to projects
          </Button>
        </Card>
      </div>
    );
  }

  const nextDue = project.current_next_action?.due_at ? formatDate(project.current_next_action.due_at) : null;

  return (
    <div className="max-w-3xl mx-auto p-12">
      <button
        onClick={() => navigate("/projects")}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to projects
      </button>

      <div className="mb-12">
        <h1 className="text-4xl mb-6">{project.title}</h1>
        {project.description && <p className="text-muted-foreground text-lg">{project.description}</p>}
      </div>

      {project.current_next_action && (
        <Card className="mb-8 border-l-4 border-l-primary p-8">
          <div className="mb-6">
            <h2 className="text-2xl mb-3">Next action</h2>
            <p className="text-xl leading-relaxed text-foreground">{project.current_next_action.title}</p>
            {nextDue && (
              <p className="text-muted-foreground mt-3">
                Due {nextDue}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              icon={<CheckCircle2 />}
              type="button"
              onClick={() => {
                setNewActionText("");
                setShowMarkDone(true);
              }}
            >
              Mark done
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setNewActionText("");
                setNewActionDate("");
                setShowAddAction(true);
              }}
            >
              Replace action
            </Button>
          </div>
        </Card>
      )}

      {project.follow_up && (
        <Card className="mb-8 border-l-4 border-l-destructive p-8">
          <div className="flex items-start gap-4 mb-6">
            <Pause className="w-7 h-7 text-destructive flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-2xl mb-3">Blocked</h2>
              <p className="text-lg mb-2">{project.follow_up.reason}</p>
              <p className="text-muted-foreground">Waiting on: {project.follow_up.waiting_on_label}</p>
              <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                <span>
                  Return date: {formatDate(project.follow_up.return_at)}
                </span>
              </div>
              {project.follow_up.suggested_action_text && (
                <p className="text-sm mt-3 text-foreground">💡 {project.follow_up.suggested_action_text}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setNewActionText("");
                setShowUnblock(true);
              }}
            >
              Unblock
            </Button>
            <Button variant="outline" onClick={() => setShowSendFollowup(true)}>
              Send reminder
            </Button>
            <Button variant="outline" onClick={() => setShowReschedule(true)}>
              Reschedule
            </Button>
          </div>
        </Card>
      )}

      {project.status === "active" && !project.current_next_action && (
        <Card className="mb-8 border-l-4 border-l-warning p-8">
          <div className="flex items-start gap-4 mb-6">
            <AlertCircle className="w-7 h-7 text-warning flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h2 className="text-2xl mb-3">No next action</h2>
              <p className="text-muted-foreground text-lg">
                This project needs a next action to move forward.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setNewActionText("");
              setNewActionDate("");
              setShowAddAction(true);
            }}
          >
            Add action
          </Button>
        </Card>
      )}

      <div className="mt-12">
        <Accordion type="single" collapsible className="space-y-2">
          {project.reference_entities && project.reference_entities.length > 0 && (
            <AccordionItem value="references" className="border-0">
              <Card className="overflow-hidden p-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <span className="text-lg">References ({project.reference_entities.length})</span>
                </AccordionTrigger>
                <AccordionContent className="px-6">
                  <div className="flex flex-wrap gap-2">
                    {project.reference_entities.map((ref) => {
                      const Icon = getReferenceIcon(ref.type);
                      return (
                        <Chip
                          key={ref.id}
                          variant={getReferenceChipVariant(ref.type)}
                          icon={<Icon className="w-3 h-3" />}
                        >
                          {ref.title}
                        </Chip>
                      );
                    })}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}

          {project.activity && project.activity.length > 0 && (
            <AccordionItem value="history" className="border-0">
              <Card className="overflow-hidden p-0">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <span className="text-lg">Activity ({project.activity.length})</span>
                </AccordionTrigger>
                <AccordionContent className="px-6">
                  <div className="space-y-4">
                    {project.activity.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="text-sm text-muted-foreground w-24 flex-shrink-0">
                          {new Date(item.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="flex-1">
                          <p className="mb-1">{eventLabel(item.event_type)}</p>
                          <p className="text-sm text-muted-foreground">{JSON.stringify(item.payload)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </Card>
            </AccordionItem>
          )}
        </Accordion>

        <div className="mt-8 relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
            <span>More</span>
          </button>

          {showMenu && (
            <Card className="mt-3 p-2">
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-secondary transition-colors">
                Edit project
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg hover:bg-secondary transition-colors">
                Put on hold
              </button>
              <button
                type="button"
                className="w-full text-left px-4 py-3 rounded-lg hover:bg-secondary transition-colors text-destructive"
                onClick={() => {
                  setShowMenu(false);
                  setShowDeleteConfirm(true);
                }}
              >
                Delete project
              </button>
            </Card>
          )}
        </div>
      </div>

      <Dialog
        open={showMarkDone}
        onOpenChange={(open) => {
          if (!open) {
            setShowMarkDone(false);
            setNewActionText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark action done</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">Mark &ldquo;{project.current_next_action?.title}&rdquo; as done?</p>
            <div className="space-y-3">
              <label className="block text-sm text-muted-foreground">Next action (optional)</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                placeholder="Leave empty if the project is complete..."
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="primary" onClick={() => void completeCurrentAction()}>
                Done
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowMarkDone(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAddAction}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddAction(false);
            setNewActionText("");
            setNewActionDate("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set next action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
            <div>
              <label className="block text-sm mb-2 text-muted-foreground">Due date (optional)</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                value={newActionDate}
                onChange={(e) => setNewActionDate(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="primary" onClick={() => void saveNextAction()}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowAddAction(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showUnblock}
        onOpenChange={(open) => {
          if (!open) {
            setShowUnblock(false);
            setNewActionText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Back to active</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">Unblock this project and return it to active?</p>
            <div>
              <label className="block text-sm mb-2 text-muted-foreground">Next action</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                placeholder="What to do next?"
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="primary"
                disabled={!newActionText.trim()}
                onClick={() => void unblockProjectSubmit()}
              >
                Unblock
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowUnblock(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showReschedule}
        onOpenChange={(open) => {
          if (!open) {
            setShowReschedule(false);
            setNewReturnDate("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule follow-up</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Button type="button" variant="primary" onClick={() => void rescheduleFollowUp()}>
                Reschedule
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowReschedule(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          if (!open) setShowDeleteConfirm(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Delete &ldquo;{project.title}&rdquo;? This removes the project, its actions, follow-ups, and linked
              references for this project. This cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="destructive" onClick={() => void confirmDeleteProject()}>
                Delete
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSendFollowup}
        onOpenChange={(open) => {
          if (!open) setShowSendFollowup(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground mb-2">Send a reminder for {project.follow_up?.waiting_on_label}?</p>
            <p className="text-sm text-muted-foreground">
              This will create a follow-up entry and send a message when configured.
            </p>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="primary" onClick={() => setShowSendFollowup(false)}>
                Send reminder
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowSendFollowup(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
