import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Deck } from "@/types";

export const ALL_DECKS = "all";
export const UNASSIGNED_DECK = "unassigned";

interface DeckPanelProps {
  decks: Deck[];
  selected: string;
  onSelect: (selected: string) => void;
  onCreate: (name: string, parentId: string | null) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface DeckNode extends Deck {
  children: DeckNode[];
}

function buildTree(decks: Deck[]): DeckNode[] {
  const nodes = new Map<string, DeckNode>(decks.map((d) => [d.id, { ...d, children: [] }]));
  const roots: DeckNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function totalCount(node: DeckNode): number {
  return node.cardCount + node.children.reduce((sum, c) => sum + totalCount(c), 0);
}

export function DeckPanel({ decks, selected, onSelect, onCreate, onRename, onDelete }: DeckPanelProps) {
  const [newDeckName, setNewDeckName] = useState("");
  const [addingUnder, setAddingUnder] = useState<string | null | undefined>(undefined);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedPanel, setCollapsedPanel] = useState(false);

  const totalCards = decks.reduce((sum, d) => sum + d.cardCount, 0);
  const tree = buildTree(decks);

  // Auto-expand the ancestor chain of the selected deck so it stays visible.
  useEffect(() => {
    if (selected === ALL_DECKS || selected === UNASSIGNED_DECK) return;
    const byId = new Map(decks.map((d) => [d.id, d]));
    setExpanded((prev) => {
      const next = new Set(prev);
      let current = byId.get(selected);
      let changed = false;
      while (current?.parentId) {
        if (!next.has(current.parentId)) {
          next.add(current.parentId);
          changed = true;
        }
        current = byId.get(current.parentId);
      }
      return changed ? next : prev;
    });
  }, [selected, decks]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    await onCreate(newDeckName.trim(), addingUnder ?? null);
    if (addingUnder) setExpanded((prev) => new Set(prev).add(addingUnder));
    setNewDeckName("");
    setAddingUnder(undefined);
  };

  const renderNode = (node: DeckNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    return (
      <div key={node.id}>
        <div
          className="group flex items-center gap-1 rounded-md hover:bg-muted"
          style={{ paddingLeft: `${depth * 1.25}rem` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="w-4 shrink-0 text-xs text-muted-foreground"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? "▾" : "▸"}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <button
            onClick={() => onSelect(node.id)}
            className={`flex-1 truncate rounded-md px-2 py-1 text-left text-sm ${
              selected === node.id ? "bg-primary text-primary-foreground" : ""
            }`}
          >
            {node.name} <span className="text-xs opacity-70">({totalCount(node)})</span>
          </button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100"
            title="Add subdeck"
            onClick={() => {
              setExpanded((prev) => new Set(prev).add(node.id));
              setAddingUnder(node.id);
            }}
          >
            +
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100"
            title="Rename deck"
            onClick={() => {
              const name = prompt("Rename deck", node.name);
              if (name && name.trim()) onRename(node.id, name.trim());
            }}
          >
            ✎
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="opacity-0 group-hover:opacity-100 text-destructive"
            title="Delete deck"
            onClick={() => {
              if (confirm(`Delete deck "${node.name}"? Cards will become unassigned.`)) onDelete(node.id);
            }}
          >
            ✕
          </Button>
        </div>
        {addingUnder === node.id && (
          <form onSubmit={handleCreate} className="ml-2 flex gap-1 py-1" style={{ paddingLeft: `${depth * 1.25}rem` }}>
            <input
              autoFocus
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Subdeck name"
              className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
            />
            <Button type="submit" size="sm">Add</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAddingUnder(undefined)}>
              Cancel
            </Button>
          </form>
        )}
        {hasChildren &&
          isExpanded &&
          node.children
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex w-full max-w-xl flex-col gap-1 rounded-xl border bg-card p-3 shadow-sm">
      <button
        onClick={() => setCollapsedPanel((c) => !c)}
        className="flex items-center gap-1 px-2 text-sm font-medium text-muted-foreground"
      >
        <span className="text-xs">{collapsedPanel ? "▸" : "▾"}</span>
        Decks
      </button>

      {!collapsedPanel && (
        <>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            <button
              onClick={() => onSelect(ALL_DECKS)}
              className={`rounded-md px-2 py-1 text-left text-sm ${
                selected === ALL_DECKS ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              All decks <span className="text-xs opacity-70">({totalCards})</span>
            </button>

            {tree
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((node) => renderNode(node, 0))}

            <button
              onClick={() => onSelect(UNASSIGNED_DECK)}
              className={`rounded-md px-2 py-1 text-left text-sm ${
                selected === UNASSIGNED_DECK ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              Unassigned{" "}
              <span className="text-xs opacity-70">
                ({decks.length === 0 ? totalCards : Math.max(0, totalCards - tree.reduce((s, n) => s + totalCount(n), 0))})
              </span>
            </button>
          </div>

          {addingUnder === null ? (
            <form onSubmit={handleCreate} className="flex gap-1 pt-1">
              <input
                autoFocus
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="New deck name"
                className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
              />
              <Button type="submit" size="sm">Add</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setAddingUnder(undefined)}>
                Cancel
              </Button>
            </form>
          ) : (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setAddingUnder(null)}>
              + New deck
            </Button>
          )}
        </>
      )}
    </div>
  );
}
