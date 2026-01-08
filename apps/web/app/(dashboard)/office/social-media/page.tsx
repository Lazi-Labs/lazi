"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { 
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal,
  Image as ImageIcon, Video, Smile, MapPin, Send
} from "lucide-react";

const posts = [
  {
    id: 1,
    user: { name: "Sarah Johnson", avatar: "/images/avatars/01.png", handle: "@sarahj" },
    content: "Just launched our new product! 🚀 So excited to share this with everyone. Check it out and let me know what you think!",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
    likes: 234,
    comments: 45,
    shares: 12,
    time: "2h ago",
    liked: false,
    saved: false,
  },
  {
    id: 2,
    user: { name: "Mike Chen", avatar: "/images/avatars/02.png", handle: "@mikechen" },
    content: "Beautiful sunset from my office window today. Sometimes you just need to stop and appreciate the little things. 🌅",
    image: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=600&h=400&fit=crop",
    likes: 567,
    comments: 89,
    shares: 34,
    time: "4h ago",
    liked: true,
    saved: true,
  },
  {
    id: 3,
    user: { name: "Emily Davis", avatar: "/images/avatars/03.png", handle: "@emilyd" },
    content: "Great team meeting today! We're making amazing progress on the Q1 goals. Proud of everyone's hard work! 💪",
    likes: 123,
    comments: 23,
    shares: 5,
    time: "6h ago",
    liked: false,
    saved: false,
  },
];

const stories = [
  { id: 1, name: "Your Story", avatar: "/images/avatars/01.png", isOwn: true },
  { id: 2, name: "Sarah", avatar: "/images/avatars/02.png", hasNew: true },
  { id: 3, name: "Mike", avatar: "/images/avatars/03.png", hasNew: true },
  { id: 4, name: "Emily", avatar: "/images/avatars/04.png", hasNew: false },
  { id: 5, name: "John", avatar: "/images/avatars/05.png", hasNew: true },
  { id: 6, name: "Lisa", avatar: "/images/avatars/06.png", hasNew: false },
];

export default function SocialMediaPage() {
  const [postContent, setPostContent] = useState("");

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      {/* Stories */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {stories.map((story) => (
              <div key={story.id} className="flex flex-col items-center gap-1 cursor-pointer shrink-0">
                <div className={cn(
                  "p-0.5 rounded-full",
                  story.hasNew ? "bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500" : "bg-muted"
                )}>
                  <Avatar className="h-12 w-12 md:h-14 md:w-14 border-2 border-background">
                    <AvatarImage src={story.avatar} />
                    <AvatarFallback>{story.name[0]}</AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs truncate w-14 md:w-16 text-center">{story.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Post */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 md:h-10 md:w-10 shrink-0">
              <AvatarImage src="/images/avatars/01.png" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Textarea 
                placeholder="What's on your mind?"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="min-h-[60px] md:min-h-[80px] resize-none border-0 focus-visible:ring-0 p-0 text-sm md:text-base"
              />
              <Separator className="my-2 md:my-3" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                  <Button variant="ghost" size="sm" className="min-h-[44px] px-2 md:px-3 shrink-0"><ImageIcon className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">Photo</span></Button>
                  <Button variant="ghost" size="sm" className="min-h-[44px] px-2 md:px-3 shrink-0"><Video className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">Video</span></Button>
                  <Button variant="ghost" size="sm" className="min-h-[44px] px-2 md:px-3 shrink-0 hidden sm:flex"><Smile className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">Feeling</span></Button>
                  <Button variant="ghost" size="sm" className="min-h-[44px] px-2 md:px-3 shrink-0 hidden sm:flex"><MapPin className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">Location</span></Button>
                </div>
                <Button disabled={!postContent.trim()} className="min-h-[44px] shrink-0">Post</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      {posts.map((post) => (
        <Card key={post.id}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage src={post.user.avatar} />
                  <AvatarFallback>{post.user.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{post.user.name}</p>
                  <p className="text-sm text-muted-foreground">{post.user.handle} • {post.time}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="mb-3">{post.content}</p>
            {post.image && (
              <img 
                src={post.image} 
                alt="Post" 
                className="rounded-lg w-full object-cover max-h-[400px]"
              />
            )}
          </CardContent>
          <CardFooter className="p-4 pt-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className={cn(post.liked && "text-red-500")}>
                  <Heart className={cn("h-4 w-4 mr-1", post.liked && "fill-current")} />
                  {post.likes}
                </Button>
                <Button variant="ghost" size="sm">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {post.comments}
                </Button>
                <Button variant="ghost" size="sm">
                  <Share2 className="h-4 w-4 mr-1" />
                  {post.shares}
                </Button>
              </div>
              <Button variant="ghost" size="icon" className={cn(post.saved && "text-primary")}>
                <Bookmark className={cn("h-4 w-4", post.saved && "fill-current")} />
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
