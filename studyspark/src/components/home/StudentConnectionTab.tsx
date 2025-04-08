"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FaSearch, FaPlus, FaComment } from "react-icons/fa";

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

const StudentConnectionTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<{[key: string]: {text: string, sent: boolean}[]}>({});

  // Filter students based on search query
  const filteredStudents = mockStudents.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.subjects.some((subject) =>
        subject.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

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
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center mb-4">
          <h1 className="text-2xl font-bold flex-1">Student Connections</h1>
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-white">ME</AvatarFallback>
          </Avatar>
        </div>
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {selectedStudent ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center space-x-2 mb-4">
              <Button
                variant="ghost"
                onClick={() => setSelectedStudent(null)}
                className="p-2"
              >
                ← Back
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-white">
                  {getInitials(mockStudents.find(s => s.id === selectedStudent)?.name || "")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold">
                  {mockStudents.find(s => s.id === selectedStudent)?.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {mockStudents.find(s => s.id === selectedStudent)?.year}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-secondary/10 rounded-lg p-4 mb-4">
              {(chatMessages[selectedStudent] || []).map((message, index) => (
                <div
                  key={index}
                  className={`mb-2 flex ${message.sent ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`rounded-lg px-3 py-2 max-w-[80%] ${
                      message.sent
                        ? "bg-primary text-white"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-2">
              <Input
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage(selectedStudent)}
              />
              <Button onClick={() => handleSendMessage(selectedStudent)}>Send</Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-semibold mb-3">Students in Your Subjects</h2>
            <div className="grid gap-4">
              {filteredStudents.map((student) => (
                <Card key={student.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Avatar className="h-12 w-12 mr-4">
                        <AvatarFallback className="bg-primary text-white">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">{student.year}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {student.subjects.map((subject, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-secondary text-secondary-foreground rounded-full px-2 py-0.5"
                            >
                              {subject}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full h-8 w-8 p-0"
                        >
                          <FaPlus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setSelectedStudent(student.id)}
                          className="rounded-full h-8 w-8 p-0"
                        >
                          <FaComment className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No students found matching your search.
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentConnectionTab;
