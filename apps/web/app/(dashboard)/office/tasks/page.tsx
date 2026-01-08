"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Plus, Search, MoreHorizontal, ArrowUpDown } from "lucide-react";

type Task = {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done" | "canceled";
  priority: "low" | "medium" | "high";
  label: string;
};

const tasks: Task[] = [
  { id: "TASK-8782", title: "You can't compress the program without quantifying the open-source SSD", status: "in-progress", priority: "medium", label: "documentation" },
  { id: "TASK-7878", title: "Try to calculate the EXE feed, maybe it will index the multi-byte pixel", status: "todo", priority: "high", label: "feature" },
  { id: "TASK-7839", title: "We need to bypass the neural TCP card", status: "done", priority: "low", label: "bug" },
  { id: "TASK-5562", title: "The SAS interface is down, bypass the open-source sensor", status: "todo", priority: "high", label: "feature" },
  { id: "TASK-8686", title: "I'll parse the wireless SSL protocol, that should driver the API panel", status: "canceled", priority: "medium", label: "documentation" },
  { id: "TASK-1280", title: "Use the digital TLS panel, then you can transmit the haptic system", status: "done", priority: "high", label: "bug" },
  { id: "TASK-7262", title: "The UTF8 application is down, parse the neural bandwidth", status: "in-progress", priority: "low", label: "feature" },
];

const statusColors = {
  "todo": "bg-slate-500",
  "in-progress": "bg-blue-500",
  "done": "bg-green-500",
  "canceled": "bg-red-500",
};

const priorityColors = {
  low: "text-blue-500",
  medium: "text-yellow-500",
  high: "text-red-500",
};

export default function TasksPage() {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const toggleTask = (id: string) => {
    setSelectedTasks(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    setSelectedTasks(prev => 
      prev.length === tasks.length ? [] : tasks.map(t => t.id)
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">Manage and track your team's tasks</p>
        </div>
        <Button className="min-h-[44px] w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> New Task</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Filter tasks..." className="pl-8 min-h-[44px]" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 sm:flex-none min-h-[44px]">Status</Button>
          <Button variant="outline" className="flex-1 sm:flex-none min-h-[44px]">Priority</Button>
        </div>
      </div>

      {/* Table - Scrollable on mobile */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[600px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox 
                  checked={selectedTasks.length === tasks.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead className="w-24">Task</TableHead>
              <TableHead>
                <Button variant="ghost" className="h-8 p-0">
                  Title <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{task.id}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{task.label}</Badge>
                    <span className="truncate max-w-[400px]">{task.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-2 w-2 rounded-full", statusColors[task.status])} />
                    <span className="capitalize">{task.status.replace("-", " ")}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn("capitalize", priorityColors[task.priority])}>
                    {task.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Copy ID</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{selectedTasks.length} of {tasks.length} row(s) selected.</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>Previous</Button>
          <Button variant="outline" size="sm" disabled>Next</Button>
        </div>
      </div>
    </div>
  );
}
