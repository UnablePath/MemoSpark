"use client";

import React, { useState, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaSearch, FaPlus, FaComment, FaTimes, FaPaperPlane, FaUsers } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock data for student profiles
const mockStudents = [
  {
    id: "1",
    name: "Alex Johnson",
    year: "Sophomore",
    subjects: ["Mathematics", "Physics"],
    interests: ["Chess", "Hiking"],
    avatar: null,
  },
  {
    id: "2",
    name: "Morgan Lee",
    year: "Junior",
    subjects: ["Computer Science", "Data Science"],
    interests: ["Gaming", "Programming"],
    avatar: null,
  },
  {
    id: "3",
    name: "Taylor Kim",
    year: "Freshman",
    subjects: ["Biology", "Chemistry"],
    interests: ["Music", "Swimming"],
    avatar: null,
  },
  {
    id: "4",
    name: "Jordan Smith",
    year: "Senior",
    subjects: ["Psychology", "Sociology"],
    interests: ["Reading", "Yoga"],
    avatar: null,
  },
];

export default function StudentConnectionTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<{[key: string]: {text: string, sent: boolean}[]}>({});

  const filteredStudents = useMemo(() => mockStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.subjects.some((subject) =>
        subject.toLowerCase().includes(searchQuery.toLowerCase())
      ) ||
      student.interests.some((interest) =>
        interest.toLowerCase().includes(searchQuery.toLowerCase())
      )
  ), [searchQuery]);

  const selectedStudent = useMemo(() => {
    return mockStudents.find(student => student.id === selectedStudentId) || null;
  }, [selectedStudentId]);

  const handleSendMessage = (studentId: string) => {
    if (!chatMessage.trim()) return;

    setChatMessages((prev) => ({
      ...prev,
      [studentId]: [
        ...(prev[studentId] || []),
        { text: chatMessage, sent: true },
      ],
    }));

    setChatMessage("");

    // Simulate response after 1 second
    setTimeout(() => {
      setChatMessages((prev) => ({
        ...prev,
        [studentId]: [
          ...(prev[studentId] || []),
          { text: "Thanks for your message! I'll get back to you soon.", sent: false },
        ],
      }));
    }, 1000);
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleSimulateGroupChat = () => {
    // In a real app, this would navigate to a group chat or open a modal
    alert("Group Chat Simulation: Imagine a bustling chat room here!");
    console.log("Simulating group chat action...");
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Search and Group Chat Button */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-grow">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search students by name, subject, interest..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSimulateGroupChat} variant="outline" size="icon" aria-label="Simulate Group Chat">
          <FaUsers className="h-5 w-5" />
        </Button>
      </div>

      {/* Student List / Chat View */}
      <div className="flex-1 relative overflow-hidden">
        {/* Student List (visible when no student selected) */}
        {!selectedStudent && (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <Card key={student.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <Avatar>
                        <AvatarImage src={student.avatar || undefined} alt={student.name} />
                        <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle>{student.name}</CardTitle>
                        <CardDescription>{student.year}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="mb-2">
                        <h4 className="text-sm font-medium mb-1">Subjects:</h4>
                        <div className="flex flex-wrap gap-1">
                          {student.subjects.map((subj) => <Badge key={subj} variant="secondary">{subj}</Badge>)}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium mb-1">Interests:</h4>
                        <div className="flex flex-wrap gap-1">
                          {student.interests.map((interest) => <Badge key={interest} variant="outline">{interest}</Badge>)}
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => alert(`Connection request sent to ${student.name}!`)}>
                        <FaPlus className="mr-1 h-3 w-3" /> Connect
                      </Button>
                      <Button size="sm" onClick={() => setSelectedStudentId(student.id)}>
                        <FaComment className="mr-1 h-3 w-3" /> Message
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground col-span-full text-center py-10">No students found matching your search.</p>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Chat View (visible when a student is selected) */}
        {selectedStudent && (
          <div className="absolute inset-0 bg-background flex flex-col h-full border rounded-lg">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-3 border-b bg-muted/40">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={selectedStudent.avatar || undefined} alt={selectedStudent.name} />
                  <AvatarFallback>{getInitials(selectedStudent.name)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold">{selectedStudent.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedStudentId(null)} aria-label="Close chat">
                <FaTimes className="h-4 w-4" />
              </Button>
            </div>

            {/* Chat Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {(chatMessages[selectedStudent.id] || []).map((msg, index) => (
                  <div key={index} className={`flex ${msg.sent ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-3 py-2 rounded-lg max-w-[75%] ${msg.sent ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {/* Placeholder if no messages */} 
                {(!chatMessages[selectedStudent.id] || chatMessages[selectedStudent.id].length === 0) && (
                    <p className="text-center text-muted-foreground text-sm">Start the conversation!</p>
                )}
              </div>
            </ScrollArea>

            {/* Chat Input */}
            <div className="p-3 border-t flex gap-2 items-center bg-muted/40">
              <Input
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(selectedStudent.id)}
                className="flex-1"
              />
              <Button onClick={() => handleSendMessage(selectedStudent.id)} size="icon" aria-label="Send message">
                <FaPaperPlane className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
