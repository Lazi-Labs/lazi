"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

const events = [
  { id: 1, title: "Team Meeting", date: 6, time: "9:00 AM", color: "bg-blue-500" },
  { id: 2, title: "Project Review", date: 6, time: "2:00 PM", color: "bg-green-500" },
  { id: 3, title: "Client Call", date: 8, time: "10:00 AM", color: "bg-purple-500" },
  { id: 4, title: "Sprint Planning", date: 10, time: "11:00 AM", color: "bg-orange-500" },
  { id: 5, title: "Design Review", date: 13, time: "3:00 PM", color: "bg-pink-500" },
  { id: 6, title: "Deadline", date: 15, time: "5:00 PM", color: "bg-red-500" },
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // January 2026
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const today = () => setCurrentDate(new Date());

  const days = [];
  
  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true });
  }
  
  // Next month days
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({ day: i, isCurrentMonth: false });
  }

  const getEventsForDay = (day: number) => events.filter(e => e.date === day);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Calendar</h1>
          <p className="text-sm text-muted-foreground">Schedule and manage your events</p>
        </div>
        <Button className="min-h-[44px] w-full sm:w-auto"><Plus className="h-4 w-4 mr-1" /> New Event</Button>
      </div>

      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <h2 className="text-lg md:text-xl font-semibold">{monthName} {year}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth} className="min-h-[44px] min-w-[44px]">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth} className="min-h-[44px] min-w-[44px]">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button variant="outline" onClick={today} className="min-h-[44px]">Today</Button>
          <Button variant="outline" className="min-h-[44px]">Month</Button>
          <Button variant="outline" className="hidden sm:flex min-h-[44px]">Week</Button>
          <Button variant="outline" className="hidden sm:flex min-h-[44px]">Day</Button>
        </div>
      </div>

      {/* Calendar Grid - Scrollable on mobile */}
      <div className="rounded-lg border overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b">
            {daysOfWeek.map((day) => (
              <div key={day} className="p-2 md:p-3 text-center text-xs md:text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {days.map((item, index) => {
              const dayEvents = item.isCurrentMonth ? getEventsForDay(item.day) : [];
              const isToday = item.isCurrentMonth && item.day === 6; // Mock today as Jan 6
              
              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[70px] md:min-h-[100px] border-b border-r p-1 md:p-2 transition-colors hover:bg-accent/50",
                    !item.isCurrentMonth && "bg-muted/30 text-muted-foreground",
                    index % 7 === 6 && "border-r-0"
                  )}
                >
                  <div className={cn(
                    "flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full text-xs md:text-sm",
                    isToday && "bg-primary text-primary-foreground font-semibold"
                  )}>
                    {item.day}
                  </div>
                  <div className="mt-1 space-y-0.5 md:space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "rounded px-1 md:px-1.5 py-0.5 text-[10px] md:text-xs text-white truncate cursor-pointer",
                          event.color
                        )}
                      >
                        <span className="hidden md:inline">{event.title}</span>
                        <span className="md:hidden">•</span>
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] md:text-xs text-muted-foreground">
                        +{dayEvents.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="rounded-lg border p-4">
        <h3 className="font-semibold mb-4">Upcoming Events</h3>
        <div className="space-y-3">
          {events.slice(0, 4).map((event) => (
            <div key={event.id} className="flex items-center gap-3">
              <div className={cn("h-3 w-3 rounded-full", event.color)} />
              <div className="flex-1">
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-muted-foreground">Jan {event.date}, 2026 at {event.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
