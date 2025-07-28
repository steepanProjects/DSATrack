import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Problem } from "@shared/schema";

interface NotesModalProps {
  problem: Problem;
  onClose: () => void;
  studentRegNo: string;
}

export function NotesModal({ problem, onClose, studentRegNo }: NotesModalProps) {
  const [noteText, setNoteText] = useState("");
  const queryClient = useQueryClient();

  const { data: note } = useQuery({
    queryKey: ["/api/student", studentRegNo, "notes", problem.id],
  });

  const saveNoteMutation = useMutation({
    mutationFn: async (noteContent: string) => {
      const res = await apiRequest("POST", `/api/student/${studentRegNo}/notes/${problem.id}`, {
        note: noteContent,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student", studentRegNo, "notes"] });
      onClose();
    },
  });

  useEffect(() => {
    if (note) {
      setNoteText(note.note || "");
    }
  }, [note]);

  const handleSave = () => {
    saveNoteMutation.mutate(noteText);
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return <Badge className="bg-secondary/10 text-secondary">Easy</Badge>;
      case "Medium":
        return <Badge className="bg-accent/10 text-accent">Medium</Badge>;
      case "Hard":
        return <Badge className="bg-danger/10 text-danger">Hard</Badge>;
      default:
        return <Badge variant="outline">{difficulty}</Badge>;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle>Problem Notes</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-slate-800 mb-2">{problem.title}</h4>
            <div className="flex items-center space-x-2">
              <Badge className="bg-primary/10 text-primary">{problem.category}</Badge>
              {getDifficultyBadge(problem.difficulty)}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Notes
            </label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your notes about this problem..."
              className="h-32 resize-none"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveNoteMutation.isPending}>
              {saveNoteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
