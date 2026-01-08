"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Search, Send, Phone, Video, MoreVertical, Paperclip, Smile, Menu, ArrowLeft } from "lucide-react";

const contacts = [
  { id: 1, name: "Alice Johnson", avatar: "/images/avatars/01.png", status: "online", lastMessage: "Hey, how are you?", time: "2m ago" },
  { id: 2, name: "Bob Smith", avatar: "/images/avatars/02.png", status: "offline", lastMessage: "See you tomorrow!", time: "1h ago" },
  { id: 3, name: "Carol Williams", avatar: "/images/avatars/03.png", status: "online", lastMessage: "Thanks for the help!", time: "3h ago" },
  { id: 4, name: "David Brown", avatar: "/images/avatars/04.png", status: "away", lastMessage: "Let me check that...", time: "1d ago" },
  { id: 5, name: "Emma Davis", avatar: "/images/avatars/05.png", status: "online", lastMessage: "Great work!", time: "2d ago" },
];

const messages = [
  { id: 1, content: "Hey! How's the project going?", own: false, time: "10:30 AM" },
  { id: 2, content: "It's going well! Just finished the main features.", own: true, time: "10:32 AM" },
  { id: 3, content: "That's great to hear! Can you show me a demo?", own: false, time: "10:33 AM" },
  { id: 4, content: "Sure, I'll set up a meeting for tomorrow.", own: true, time: "10:35 AM" },
  { id: 5, content: "Perfect! Looking forward to it.", own: false, time: "10:36 AM" },
];

export default function ChatPage() {
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [message, setMessage] = useState("");
  const [showContacts, setShowContacts] = useState(false);

  const ContactsList = () => (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Messages</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." className="pl-8" />
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => {
                setSelectedContact(contact);
                setShowContacts(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors min-h-[60px]",
                selectedContact.id === contact.id ? "bg-accent" : "hover:bg-accent/50"
              )}
            >
              <div className="relative">
                <Avatar>
                  <AvatarImage src={contact.avatar} />
                  <AvatarFallback>{contact.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                </Avatar>
                <span className={cn(
                  "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
                  contact.status === "online" ? "bg-green-500" : contact.status === "away" ? "bg-yellow-500" : "bg-gray-400"
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{contact.name}</span>
                  <span className="text-xs text-muted-foreground">{contact.time}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-3rem)] md:h-[calc(100vh-var(--header-height)-3rem)] rounded-md border">
      {/* Desktop Contacts Sidebar */}
      <div className="hidden md:flex w-80 border-r flex-col">
        <ContactsList />
      </div>

      {/* Mobile Contacts Sheet */}
      <Sheet open={showContacts} onOpenChange={setShowContacts}>
        <SheetContent side="left" className="w-full sm:w-80 p-0">
          <ContactsList />
        </SheetContent>
      </Sheet>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden min-h-[44px] min-w-[44px]"
              onClick={() => setShowContacts(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8 md:h-10 md:w-10">
              <AvatarImage src={selectedContact.avatar} />
              <AvatarFallback>{selectedContact.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-sm md:text-base">{selectedContact.name}</h3>
              <p className="text-xs md:text-sm text-muted-foreground capitalize">{selectedContact.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]"><Phone className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="hidden sm:flex min-h-[44px] min-w-[44px]"><Video className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]"><MoreVertical className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-3 md:p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.own ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] md:max-w-[70%] rounded-lg px-3 md:px-4 py-2",
                  msg.own ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <p className="text-sm md:text-base">{msg.content}</p>
                  <span className={cn(
                    "text-xs mt-1 block",
                    msg.own ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>{msg.time}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-3 md:p-4 border-t">
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]"><Paperclip className="h-4 w-4" /></Button>
            <Input 
              placeholder="Type a message..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 min-h-[44px]"
            />
            <Button variant="ghost" size="icon" className="hidden sm:flex min-h-[44px] min-w-[44px]"><Smile className="h-4 w-4" /></Button>
            <Button size="icon" className="min-h-[44px] min-w-[44px]"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
