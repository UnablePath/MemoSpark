"use client";

import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Upload, Download, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  parseICalFile, 
  exportToICal, 
  validateICalData,
  convertICalEventsToTasks,
  convertICalEventsToTimetableEntries,
  type ParsedICalEvent,
  type ExportData 
} from '@/lib/ical';
import type { Task, TimetableEntry } from '@/types/taskTypes';

interface ICalImportExportProps {
  tasks?: Task[];
  timetableEntries?: TimetableEntry[];
  onTasksImported?: (tasks: Partial<Task>[]) => void;
  onTimetableEntriesImported?: (entries: Partial<TimetableEntry>[]) => void;
  className?: string;
}

interface ImportResult {
  success: boolean;
  tasksCount: number;
  timetableCount: number;
  errors: string[];
  warnings: string[];
}

export const ICalImportExport: React.FC<ICalImportExportProps> = ({
  tasks = [],
  timetableEntries = [],
  onTasksImported,
  onTimetableEntriesImported,
  className
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.ics')) {
      setImportResult({
        success: false,
        tasksCount: 0,
        timetableCount: 0,
        errors: ['Please select a valid .ics file'],
        warnings: []
      });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      
      // Validate the iCal content
      const validation = validateICalData(content);
      if (!validation.isValid) {
        setImportResult({
          success: false,
          tasksCount: 0,
          timetableCount: 0,
          errors: validation.errors,
          warnings: validation.warnings
        });
        setIsImporting(false);
        return;
      }

      // Parse the iCal content
      const parseResult = parseICalFile(content);
      if (!parseResult.success) {
        setImportResult({
          success: false,
          tasksCount: 0,
          timetableCount: 0,
          errors: [parseResult.error || 'Failed to parse iCal file'],
          warnings: []
        });
        setIsImporting(false);
        return;
      }

      // Convert events to tasks and timetable entries
      const importedTasks = convertICalEventsToTasks(parseResult.events);
      const importedTimetableEntries = convertICalEventsToTimetableEntries(parseResult.events);

      // Call the callback functions
      if (importedTasks.length > 0 && onTasksImported) {
        onTasksImported(importedTasks);
      }
      if (importedTimetableEntries.length > 0 && onTimetableEntriesImported) {
        onTimetableEntriesImported(importedTimetableEntries);
      }

      setImportResult({
        success: true,
        tasksCount: importedTasks.length,
        timetableCount: importedTimetableEntries.length,
        errors: [],
        warnings: validation.warnings
      });
      
      setIsImporting(false);
    };

    reader.onerror = () => {
      setImportResult({
        success: false,
        tasksCount: 0,
        timetableCount: 0,
        errors: ['Failed to read file'],
        warnings: []
      });
      setIsImporting(false);
    };

    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleExport = () => {
    setIsExporting(true);

    const exportData: ExportData = {
      tasks,
      timetableEntries
    };

    const icalContent = exportToICal(exportData);
    
    const blob = new Blob([icalContent], {
      type: 'text/calendar;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StudySpark_Calendar_${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  return (
    <div className={className}>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import iCal File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`
                border-2 border-dashed rounded-lg p-6 text-center transition-colors
                ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                ${isImporting ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                Drag and drop your .ics file here, or
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {isImporting && (
              <div className="space-y-2">
                <Progress value={undefined} className="h-2" />
                <p className="text-sm text-gray-600">Processing iCal file...</p>
              </div>
            )}

            {importResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <Alert variant={importResult.success ? "default" : "destructive"}>
                  <div className="flex items-center gap-2">
                    {importResult.success ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {importResult.success ? (
                        <div className="space-y-1">
                          <p>Import successful!</p>
                          <div className="flex gap-2">
                            {importResult.tasksCount > 0 && (
                              <Badge variant="secondary">
                                {importResult.tasksCount} tasks
                              </Badge>
                            )}
                            {importResult.timetableCount > 0 && (
                              <Badge variant="secondary">
                                {importResult.timetableCount} classes
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p>Import failed:</p>
                          <ul className="list-disc list-inside text-sm">
                            {importResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </div>
                </Alert>

                {importResult.warnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p>Warnings:</p>
                      <ul className="list-disc list-inside text-sm">
                        {importResult.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export to iCal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-600 space-y-2">
              <p>Export your calendar data to an .ics file that can be imported into:</p>
              <ul className="list-disc list-inside ml-4">
                <li>Google Calendar</li>
                <li>Apple Calendar</li>
                <li>Outlook</li>
                <li>Other calendar applications</li>
              </ul>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="space-y-1">
                <p className="font-medium">Export includes:</p>
                <div className="flex gap-2">
                  {tasks.length > 0 && (
                    <Badge variant="outline">{tasks.length} tasks</Badge>
                  )}
                  {timetableEntries.length > 0 && (
                    <Badge variant="outline">{timetableEntries.length} classes</Badge>
                  )}
                  {tasks.length === 0 && timetableEntries.length === 0 && (
                    <Badge variant="outline">No data to export</Badge>
                  )}
                </div>
              </div>
            </div>

            <Button
              onClick={handleExport}
              disabled={isExporting || (tasks.length === 0 && timetableEntries.length === 0)}
              className="w-full"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Calendar
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};



