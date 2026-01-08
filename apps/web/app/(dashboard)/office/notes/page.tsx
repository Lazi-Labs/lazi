"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Plus, Search, Star, Trash2, Tag, Menu, ArrowLeft } from "lucide-react";

const initialNotes = [
  { id: 1, title: "Meeting Notes", content: "Discussed project timeline and deliverables. Key points: deadline is next Friday, need to coordinate with design team.", date: "Jan 5, 2026", starred: true, labels: ["work", "important"] },
  { id: 2, title: "Shopping List", content: "Milk, bread, eggs, cheese, vegetables, fruits, chicken", date: "Jan 4, 2026", starred: false, labels: ["personal"] },
  { id: 3, title: "Project Ideas", content: "1. Mobile app for task management\n2. AI-powered chatbot\n3. Dashboard analytics tool", date: "Jan 3, 2026", starred: true, labels: ["work", "ideas"] },
  { id: 4, title: "Book Recommendations", content: "- Clean Code by Robert Martin\n- The Pragmatic Programmer\n- Design Patterns", date: "Jan 2, 2026", starred: false, labels: ["personal", "reading"] },
];

export default function NotesPage() {
  const [notes, setNotes] = useState(initialNotes);
  const [selectedNote, setSelectedNote] = useState(notes[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotesList, setShowNotesList] = useState(false);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleStar = (id: number) => {
    setNotes(notes.map(note => 
      note.id === id ? { ...note, starred: !note.starred } : note
    ));
  };

  const NotesList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Notes</h2>
          <Button size="sm" className="min-h-[44px]"><Plus className="h-4 w-4 mr-1" /> New</Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search notes..." 
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => {
                setSelectedNote(note);
                setShowNotesList(false);
              }}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-colors min-h-[80px]",
                selectedNote.id === note.id ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium truncate">{note.title}</h3>
                {note.starred && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{note.content}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs text-muted-foreground">{note.date}</span>
                {note.labels.slice(0, 2).map(label => (
                  <Badge key={label} variant="secondary" className="text-xs">{label}</Badge>
                ))}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-3rem)] rounded-md border">
      {/* Desktop Notes List */}
      <div className="hidden md:flex w-80 border-r flex-col">
        <NotesList />
      </div>

      {/* Mobile Notes List Sheet */}
      <Sheet open={showNotesList} onOpenChange={setShowNotesList}>
        <SheetContent side="left" className="w-full sm:w-80 p-0">
          <NotesList />
        </SheetContent>
      </Sheet>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-3 md:p-4 border-b gap-2">
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden min-h-[44px] min-w-[44px] shrink-0"
            onClick={() => setShowNotesList(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Input 
            value={selectedNote.title}
            className="text-base md:text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0 flex-1"
            placeholder="Note title..."
          />
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => toggleStar(selectedNote.id)}>
              <Star className={cn("h-4 w-4", selectedNote.starred && "fill-yellow-400 text-yellow-400")} />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex min-h-[44px] min-w-[44px]"><Tag className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex-1 p-3 md:p-4">
          <Textarea 
            value={selectedNote.content}
            className="h-full resize-none border-0 focus-visible:ring-0 text-sm md:text-base"
            placeholder="Start writing..."
          />
        </div>
        <div className="p-3 md:p-4 border-t flex items-center gap-2 flex-wrap">
          {selectedNote.labels.map(label => (
            <Badge key={label} variant="outline">{label}</Badge>
          ))}
          <span className="text-xs md:text-sm text-muted-foreground ml-auto">Last edited: {selectedNote.date}</span>
        </div>
      </div>
    </div>
  );
}
