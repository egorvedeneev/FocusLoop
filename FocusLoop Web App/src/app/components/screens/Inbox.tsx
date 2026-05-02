import { useEffect, useRef, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { FAB } from "../ui/FAB";
import { PageSpinner } from "../ui/spinner";
import { SegmentedControl } from "../ui/SegmentedControl";
import { api, InboxItem, ProjectListItem, ReferenceType } from "../../api/client";
import { Plus, FolderPlus, Target, Archive, Clock, BookOpen, ArrowRight, ArrowLeft, X } from "lucide-react";

type ClarifyMode = null | "project" | "action" | "blocked" | "reference" | "archive";

export function Inbox() {
  const captureInputRef = useRef<HTMLInputElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [clarifyMode, setClarifyMode] = useState<ClarifyMode>(null);
  const [items, setItems] = useState<InboxItem[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [captureText, setCaptureText] = useState("");

  // Form states
  const [projectTitle, setProjectTitle] = useState("");
  const [projectNotes, setProjectNotes] = useState("");
  const [nextActionText, setNextActionText] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [waitingOn, setWaitingOn] = useState("");
  const [blockerReason, setBlockerReason] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [suggestedAction, setSuggestedAction] = useState("");
  const [referenceType, setReferenceType] = useState<ReferenceType>("person");
  const [referenceName, setReferenceName] = useState("");
  const [referenceNotes, setReferenceNotes] = useState("");
  const [referenceContact, setReferenceContact] = useState("");

  const [loading, setLoading] = useState(true);

  const loadData = (quiet = false) => {
    if (!quiet) setLoading(true);
    return Promise.all([api.inboxItems("new"), api.projects("active")])
      .then(([inbox, projectList]) => {
        setItems(inbox.items);
        setProjects(projectList.items);
        setCurrentIndex(0);
      })
      .finally(() => {
        if (!quiet) setLoading(false);
      });
  };

  useEffect(() => {
    void loadData();
  }, []);

  const unprocessedItems = items;
  const currentItem = unprocessedItems[currentIndex];
  const activeProjects = projects;

  const resetForms = () => {
    setProjectTitle("");
    setProjectNotes("");
    setNextActionText("");
    setSelectedProject("");
    setWaitingOn("");
    setBlockerReason("");
    setReturnDate("");
    setSuggestedAction("");
    setReferenceType("person");
    setReferenceName("");
    setReferenceNotes("");
    setReferenceContact("");
  };

  const handleSave = async () => {
    if (!currentItem || !clarifyMode) return;
    if (clarifyMode === "action" && !selectedProject) return;
    if (clarifyMode === "blocked" && (!selectedProject || !waitingOn.trim() || !returnDate)) return;

    if (clarifyMode === "project") {
      await api.clarifyInboxItem(currentItem.id, "project", {
        title: projectTitle || currentItem.raw_text,
        description: projectNotes,
        next_action_title: nextActionText || currentItem.raw_text,
      });
    }
    if (clarifyMode === "action") {
      await api.clarifyInboxItem(currentItem.id, "next_action", {
        project_id: selectedProject,
        title: nextActionText || currentItem.raw_text,
      });
    }
    if (clarifyMode === "blocked") {
      await api.clarifyInboxItem(currentItem.id, "follow_up", {
        project_id: selectedProject,
        waiting_on_type: "person",
        waiting_on_label: waitingOn,
        reason: blockerReason || currentItem.raw_text,
        return_at: new Date(returnDate).toISOString(),
        suggested_action_text: suggestedAction,
      });
    }
    if (clarifyMode === "reference") {
      await api.clarifyInboxItem(currentItem.id, "reference", {
        type: referenceType,
        title: referenceName || currentItem.raw_text,
        description: referenceNotes,
        metadata: referenceContact.trim() ? { contact: referenceContact.trim() } : {},
      });
    }
    if (clarifyMode === "archive") {
      await api.archiveInboxItem(currentItem.id);
    }

    resetForms();
    setClarifyMode(null);
    void loadData(true);
  };

  const capture = async () => {
    if (!captureText.trim()) return;
    await api.createInboxItem(captureText.trim());
    setCaptureText("");
    void loadData(true);
  };

  const handleCancel = () => {
    resetForms();
    setClarifyMode(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl mb-3">Inbox</h1>
        <p className="text-muted-foreground text-lg">
          Process one item at a time
        </p>
      </div>

      {loading && <PageSpinner message="Loading inbox…" />}

      {/* Empty State */}
      {!loading && unprocessedItems.length === 0 && (
        <Card className="text-center py-20">
          <Archive className="w-16 h-16 text-muted-foreground mx-auto mb-6" />
          <h3 className="text-2xl mb-3">Inbox Zero</h3>
          <p className="text-muted-foreground text-lg">
            All items processed
          </p>
        </Card>
      )}

      {/* Processing Mode */}
      {!loading && unprocessedItems.length > 0 && currentItem && (
        <div>
          {/* Progress */}
          <div className="text-center mb-8 text-muted-foreground">
            <span className="text-lg">
              {currentIndex + 1} of {unprocessedItems.length}
            </span>
          </div>

          {/* Current Item */}
          <Card className="mb-8 p-10">
            <p className="text-2xl leading-relaxed mb-6">{currentItem.raw_text}</p>
            <p className="text-sm text-muted-foreground">
              Captured{" "}
              {new Date(currentItem.captured_at).toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </Card>

          {/* Clarify Form */}
          {clarifyMode && (
            <Card className="mb-8 p-8 border-l-4 border-l-primary">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-xl">
                  {clarifyMode === 'project' && 'Create project'}
                  {clarifyMode === 'action' && 'Add to existing project'}
                  {clarifyMode === 'blocked' && 'Create blocked follow-up'}
                  {clarifyMode === 'reference' && 'Create reference'}
                  {clarifyMode === 'archive' && 'Archive item'}
                </h3>
                <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Create Project Form */}
              {clarifyMode === 'project' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Project title</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="What is this project about?"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Notes (optional)</label>
                    <textarea
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors resize-none"
                      placeholder="Any details or context..."
                      rows={2}
                      value={projectNotes}
                      onChange={(e) => setProjectNotes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">First action (optional)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="What to do next?"
                      value={nextActionText}
                      onChange={(e) => setNextActionText(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="primary" onClick={() => void handleSave()}>Create project</Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Add to Project Form */}
              {clarifyMode === 'action' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Choose project</label>
                    <select
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      autoFocus
                    >
                      <option value="">Select a project...</option>
                      {activeProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Next action</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="What needs to be done?"
                      value={nextActionText}
                      onChange={(e) => setNextActionText(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="primary" onClick={() => void handleSave()} disabled={!selectedProject}>
                      Add action
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Create Blocked Follow-up Form */}
              {clarifyMode === 'blocked' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Related project (optional)</label>
                    <select
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                    >
                      <option value="">Create new project</option>
                      {activeProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Waiting on</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="Person, team, or system..."
                      value={waitingOn}
                      onChange={(e) => setWaitingOn(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Reason for block</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="What are you waiting for?"
                      value={blockerReason}
                      onChange={(e) => setBlockerReason(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Return date</label>
                    <input
                      type="date"
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Suggested action (optional)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="What to do when it comes back..."
                      value={suggestedAction}
                      onChange={(e) => setSuggestedAction(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="primary"
                      onClick={() => void handleSave()}
                      disabled={!selectedProject || !waitingOn.trim() || !returnDate}
                    >
                      Create follow-up
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Create Reference Form */}
              {clarifyMode === 'reference' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Type</label>
                    <SegmentedControl
                      options={[
                        { value: "person", label: "Person" },
                        { value: "team", label: "Team" },
                        { value: "service", label: "Service" },
                        { value: "document", label: "Document" },
                      ]}
                      value={referenceType}
                      onChange={(v) => setReferenceType(v as ReferenceType)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Title</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                      placeholder="Who or what is this?"
                      value={referenceName}
                      onChange={(e) => setReferenceName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  {(referenceType === 'person' || referenceType === 'team') && (
                    <div>
                      <label className="block text-sm mb-2 text-muted-foreground">Email or contact (optional)</label>
                      <input
                        type="text"
                        className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
                        placeholder="How to reach them..."
                        value={referenceContact}
                        onChange={(e) => setReferenceContact(e.target.value)}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Notes (optional)</label>
                    <textarea
                      className="w-full px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors resize-none"
                      placeholder="Useful context..."
                      rows={2}
                      value={referenceNotes}
                      onChange={(e) => setReferenceNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button variant="primary" onClick={() => void handleSave()}>Create reference</Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Archive Confirmation */}
              {clarifyMode === 'archive' && (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    This item will be archived and removed from your inbox. You can find it later in the archive.
                  </p>
                  <div className="flex gap-3 pt-4">
                    <Button variant="primary" onClick={() => void handleSave()}>Archive</Button>
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Actions - only show if no clarify mode active */}
          {!clarifyMode && (
            <div className="mb-8">
              <h3 className="text-lg text-muted-foreground mb-6">What should happen?</h3>
              <div className="space-y-3">
                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setClarifyMode('project')}
                  hover
                >
                  <div className="flex items-center gap-4">
                    <FolderPlus className="w-6 h-6 text-primary" />
                    <div>
                      <div className="text-xl">Create project</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Turn this into a new project with a next action
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setClarifyMode('action')}
                  hover
                >
                  <div className="flex items-center gap-4">
                    <Target className="w-6 h-6 text-primary" />
                    <div>
                      <div className="text-xl">Add to existing project</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Add as the next action on an active project
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setClarifyMode('blocked')}
                  hover
                >
                  <div className="flex items-center gap-4">
                    <Clock className="w-6 h-6 text-warning" />
                    <div>
                      <div className="text-xl">Create blocked follow-up</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Waiting on someone else; needs a reminder
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setClarifyMode('reference')}
                  hover
                >
                  <div className="flex items-center gap-4">
                    <BookOpen className="w-6 h-6 text-success" />
                    <div>
                      <div className="text-xl">Create reference</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Save as a person, team, service, or document
                      </p>
                    </div>
                  </div>
                </Card>

                <Card
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setClarifyMode('archive')}
                  hover
                >
                  <div className="flex items-center gap-4">
                    <Archive className="w-6 h-6 text-muted-foreground" />
                    <div>
                      <div className="text-xl">Archive</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        No action needed — reference only
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Navigation - only show if no clarify mode active */}
          {!clarifyMode && (
            <div className="flex gap-4 justify-between">
              <Button
                variant="outline"
                icon={<ArrowLeft />}
                onClick={() => {
                  if (currentIndex > 0) {
                    setCurrentIndex(currentIndex - 1);
                  }
                }}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (currentIndex < unprocessedItems.length - 1) {
                    setCurrentIndex(currentIndex + 1);
                  }
                }}
              >
                Skip for now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      )}

      {!loading && (
        <>
          <div className="mt-10 flex gap-3">
            <input
              ref={captureInputRef}
              type="text"
              className="flex-1 px-4 py-3 bg-input-background rounded-xl border border-border focus:border-primary focus:outline-none transition-colors"
              placeholder="Quick capture a new item..."
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
            />
            <Button variant="primary" onClick={() => void capture()}>
              Add
            </Button>
          </div>
          <FAB
            icon={<Plus />}
            label="Add"
            onClick={() => {
              if (captureText.trim()) {
                void capture();
                return;
              }
              captureInputRef.current?.focus();
              captureInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        </>
      )}
    </div>
  );
}
