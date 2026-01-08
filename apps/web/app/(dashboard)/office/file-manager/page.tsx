"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { 
  Search, Upload, FolderPlus, Grid, List, MoreVertical,
  Folder, FileText, Image, FileVideo, FileAudio, File,
  Download, Trash2, Share2, Star
} from "lucide-react";

type FileItem = {
  id: number;
  name: string;
  type: "folder" | "document" | "image" | "video" | "audio" | "other";
  size?: string;
  modified: string;
  starred?: boolean;
};

const files: FileItem[] = [
  { id: 1, name: "Documents", type: "folder", modified: "Jan 5, 2026" },
  { id: 2, name: "Images", type: "folder", modified: "Jan 4, 2026" },
  { id: 3, name: "Videos", type: "folder", modified: "Jan 3, 2026" },
  { id: 4, name: "Project Proposal.pdf", type: "document", size: "2.4 MB", modified: "Jan 5, 2026", starred: true },
  { id: 5, name: "Meeting Notes.docx", type: "document", size: "156 KB", modified: "Jan 4, 2026" },
  { id: 6, name: "Screenshot.png", type: "image", size: "1.2 MB", modified: "Jan 3, 2026" },
  { id: 7, name: "Presentation.pptx", type: "document", size: "5.8 MB", modified: "Jan 2, 2026", starred: true },
  { id: 8, name: "Demo Video.mp4", type: "video", size: "45.2 MB", modified: "Jan 1, 2026" },
  { id: 9, name: "Audio Recording.mp3", type: "audio", size: "8.5 MB", modified: "Dec 31, 2025" },
  { id: 10, name: "Data Export.csv", type: "other", size: "324 KB", modified: "Dec 30, 2025" },
];

const getFileIcon = (type: FileItem["type"]) => {
  switch (type) {
    case "folder": return <Folder className="h-10 w-10 text-blue-500" />;
    case "document": return <FileText className="h-10 w-10 text-red-500" />;
    case "image": return <Image className="h-10 w-10 text-green-500" />;
    case "video": return <FileVideo className="h-10 w-10 text-purple-500" />;
    case "audio": return <FileAudio className="h-10 w-10 text-orange-500" />;
    default: return <File className="h-10 w-10 text-gray-500" />;
  }
};

export default function FileManagerPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);

  const toggleFile = (id: number) => {
    setSelectedFiles(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">File Manager</h1>
          <p className="text-sm text-muted-foreground">Manage your files and folders</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none min-h-[44px]"><FolderPlus className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">New </span>Folder</Button>
          <Button className="flex-1 sm:flex-none min-h-[44px]"><Upload className="h-4 w-4 mr-1" /> Upload</Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search files..." className="pl-8 min-h-[44px]" />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={viewMode === "grid" ? "secondary" : "ghost"} 
            size="icon"
            onClick={() => setViewMode("grid")}
            className="min-h-[44px] min-w-[44px]"
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === "list" ? "secondary" : "ghost"} 
            size="icon"
            onClick={() => setViewMode("list")}
            className="min-h-[44px] min-w-[44px]"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-primary cursor-pointer hover:underline">My Files</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">All Files</span>
      </div>

      {/* Files Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                "group relative rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent/50",
                selectedFiles.includes(file.id) && "bg-accent border-primary"
              )}
              onClick={() => toggleFile(file.id)}
            >
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Download</DropdownMenuItem>
                    <DropdownMenuItem><Share2 className="h-4 w-4 mr-2" /> Share</DropdownMenuItem>
                    <DropdownMenuItem><Star className="h-4 w-4 mr-2" /> Star</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {file.starred && (
                <Star className="absolute top-2 left-2 h-4 w-4 fill-yellow-400 text-yellow-400" />
              )}
              <div className="flex flex-col items-center text-center">
                {getFileIcon(file.type)}
                <p className="mt-2 font-medium truncate w-full">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {file.size || "—"} • {file.modified}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <div className="min-w-[500px]">
            {files.map((file, index) => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-3 md:gap-4 p-3 cursor-pointer transition-colors hover:bg-accent/50 min-h-[60px]",
                  selectedFiles.includes(file.id) && "bg-accent",
                  index !== files.length - 1 && "border-b"
                )}
                onClick={() => toggleFile(file.id)}
              >
                <Checkbox checked={selectedFiles.includes(file.id)} className="h-5 w-5" />
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate text-sm md:text-base">{file.name}</p>
                    {file.starred && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 shrink-0" />}
                  </div>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground w-16 md:w-20 text-right">{file.size || "—"}</p>
                <p className="text-xs md:text-sm text-muted-foreground w-24 md:w-32 hidden sm:block">{file.modified}</p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Download</DropdownMenuItem>
                    <DropdownMenuItem><Share2 className="h-4 w-4 mr-2" /> Share</DropdownMenuItem>
                    <DropdownMenuItem><Star className="h-4 w-4 mr-2" /> Star</DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-sm text-muted-foreground">
        {selectedFiles.length > 0 
          ? `${selectedFiles.length} item(s) selected`
          : `${files.length} items • 64.5 MB used`
        }
      </div>
    </div>
  );
}
