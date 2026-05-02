import { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { SegmentedControl } from "../ui/SegmentedControl";
import { Chip } from "../ui/Chip";
import { FAB } from "../ui/FAB";
import { Button } from "../ui/button";
import { Dialog } from "../ui/dialog";
import { PageSpinner } from "../ui/spinner";
import { api, ReferenceEntity, ReferenceType } from "../../api/client";
import { Search, User, Users, Server, FileText, Plus, BookOpen } from "lucide-react";
import { useNavigate } from "react-router";

export function Reference() {
  const [filter, setFilter] = useState<string>("all");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRef, setExpandedRef] = useState<string | null>(null);
  const [references, setReferences] = useState<ReferenceEntity[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState<ReferenceType>("person");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const loadReferences = () => {
    setLoading(true);
    setReferences([]);
    return api
      .references(filter === "all" ? undefined : (filter as ReferenceType))
      .then((p) => setReferences(p.items))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    void loadReferences();
  }, [filter]);

  const getLinkedProjects = (_refId: string) => [] as { id: string; title: string; nextAction?: string }[];

  const getTypeIcon = (type: ReferenceType) => {
    switch (type) {
      case "person":
        return User;
      case "team":
        return Users;
      case "service":
        return Server;
      case "document":
        return FileText;
    }
  };

  const getTypeChipVariant = (type: ReferenceType): "default" | "primary" | "success" | "warning" => {
    switch (type) {
      case "person":
        return "primary";
      case "team":
        return "success";
      case "service":
        return "warning";
      case "document":
        return "default";
    }
  };

  const filteredReferences = references.filter(
    (ref) =>
      ref.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ref.description && ref.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const contactFromMeta = (ref: ReferenceEntity) => {
    const c = ref.metadata?.contact;
    return typeof c === "string" ? c : null;
  };

  const createReference = async () => {
    if (!newTitle.trim()) return;
    await api.createReference({ type: newType, title: newTitle.trim(), description: newDescription || undefined });
    setNewTitle("");
    setNewDescription("");
    setShowAdd(false);
    void loadReferences();
  };

  return (
    <div className="max-w-4xl mx-auto p-12">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl mb-8">Reference</h1>

        <div className="flex items-center gap-4 mb-6">
          <SegmentedControl
            options={[
              { value: "all", label: "All" },
              { value: "person", label: "People" },
              { value: "team", label: "Teams" },
              { value: "service", label: "Services" },
              { value: "document", label: "Documents" },
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
              placeholder="Search reference..."
              className="w-full pl-12 pr-4 py-3 bg-card rounded-2xl border border-border focus:border-primary focus:outline-none transition-colors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </div>

      {loading && <PageSpinner message="Loading reference…" />}

      {/* Empty State */}
      {!loading && filteredReferences.length === 0 && (
        <Card className="text-center py-16">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl mb-2">No references found</h3>
          <p className="text-muted-foreground">
            {searchQuery
              ? "Try adjusting your search"
              : `No ${
                  filter === "all"
                    ? "entries"
                    : filter === "person"
                      ? "people"
                      : filter === "team"
                        ? "teams"
                        : filter === "service"
                          ? "services"
                          : "documents"
                } in reference`}
          </p>
        </Card>
      )}

      {/* References List */}
      {!loading && (
        <div className="space-y-4">
        {filteredReferences.map((reference) => {
          const Icon = getTypeIcon(reference.type);
          const linkedProjects = getLinkedProjects(reference.id);
          const isExpanded = expandedRef === reference.id;

          return (
            <Card key={reference.id} className="hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  <Icon className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl">{reference.title}</h3>
                    <Chip variant={getTypeChipVariant(reference.type)} icon={<Icon className="w-3 h-3" />}>
                      {reference.type === "person"
                        ? "person"
                        : reference.type === "team"
                          ? "team"
                          : reference.type === "service"
                            ? "service"
                            : "document"}
                    </Chip>
                  </div>

                  {(reference.url || contactFromMeta(reference)) && (
                    <p className="text-muted-foreground text-sm mb-2">{reference.url ?? contactFromMeta(reference)}</p>
                  )}

                  {reference.description && (
                    <p className="text-muted-foreground mb-3">{reference.description}</p>
                  )}

                  {linkedProjects.length > 0 && (
                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedRef(isExpanded ? null : reference.id)}
                        className="text-sm text-primary hover:underline"
                      >
                        {linkedProjects.length} linked project{linkedProjects.length !== 1 ? "s" : ""}
                        {isExpanded ? " ▼" : " ▶"}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-border">
                          {linkedProjects.map((project) => (
                            <div
                              key={project.id}
                              className="cursor-pointer hover:text-primary transition-colors"
                              onClick={() => navigate(`/projects/${project.id}`)}
                            >
                              <p className="text-sm">{project.title}</p>
                              {project.nextAction && (
                                <p className="text-xs text-muted-foreground mt-1">Next: {project.nextAction}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      )}

      {/* Add Reference FAB */}
      {!loading && <FAB icon={<Plus />} label="Add reference" onClick={() => setShowAdd(true)} />}

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add reference">
        <div className="space-y-4">
          <select
            className="w-full px-4 py-3 bg-input-background rounded-xl border border-border"
            value={newType}
            onChange={(e) => setNewType(e.target.value as ReferenceType)}
          >
            <option value="person">Person</option>
            <option value="team">Team</option>
            <option value="service">Service</option>
            <option value="document">Document</option>
          </select>
          <input
            className="w-full px-4 py-3 bg-input-background rounded-xl border border-border"
            placeholder="Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            className="w-full px-4 py-3 bg-input-background rounded-xl border border-border"
            placeholder="Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={() => void createReference()}>
              Create
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
