"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Plus, Calendar, Flag, Trash2 } from "lucide-react";

type Todo = {
  id: number;
  title: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  dueDate?: string;
};

const initialTodos: Todo[] = [
  { id: 1, title: "Review project proposal", completed: false, priority: "high", dueDate: "Jan 6, 2026" },
  { id: 2, title: "Send weekly report", completed: false, priority: "medium", dueDate: "Jan 7, 2026" },
  { id: 3, title: "Update documentation", completed: true, priority: "low" },
  { id: 4, title: "Schedule team meeting", completed: false, priority: "high", dueDate: "Jan 8, 2026" },
  { id: 5, title: "Fix bug in login flow", completed: true, priority: "high" },
  { id: 6, title: "Prepare presentation slides", completed: false, priority: "medium", dueDate: "Jan 10, 2026" },
];

const priorityColors = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-red-500",
};

export default function TodoListPage() {
  const [todos, setTodos] = useState(initialTodos);
  const [newTodo, setNewTodo] = useState("");

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    setTodos([
      ...todos,
      { id: Date.now(), title: newTodo, completed: false, priority: "medium" }
    ]);
    setNewTodo("");
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  const TodoItem = ({ todo }: { todo: Todo }) => (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border transition-colors",
      todo.completed && "opacity-60"
    )}>
      <div className="flex items-center gap-3 flex-1">
        <Checkbox 
          checked={todo.completed} 
          onCheckedChange={() => toggleTodo(todo.id)}
          className="h-5 w-5"
        />
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium text-sm md:text-base", todo.completed && "line-through")}>{todo.title}</p>
          {todo.dueDate && (
            <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground mt-1">
              <Calendar className="h-3 w-3" />
              <span>{todo.dueDate}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-8 sm:ml-0">
        <div className={cn("h-2 w-2 rounded-full shrink-0", priorityColors[todo.priority])} />
        <Badge variant="outline" className="capitalize text-xs">{todo.priority}</Badge>
        <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" onClick={() => deleteTodo(todo.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Todo List</h1>
          <p className="text-sm text-muted-foreground">{activeTodos.length} tasks remaining</p>
        </div>
      </div>

      {/* Add Todo */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input 
          placeholder="Add a new task..." 
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          className="flex-1 min-h-[44px]"
        />
        <Button onClick={addTodo} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1" /> Add Task</Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({todos.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeTodos.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedTodos.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="space-y-2 mt-4">
          {todos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
        </TabsContent>
        <TabsContent value="active" className="space-y-2 mt-4">
          {activeTodos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
        </TabsContent>
        <TabsContent value="completed" className="space-y-2 mt-4">
          {completedTodos.map(todo => <TodoItem key={todo.id} todo={todo} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
