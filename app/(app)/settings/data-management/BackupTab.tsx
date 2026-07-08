'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Download, FileText, HardDrive, RefreshCw, RotateCcw } from 'lucide-react';
import type { BackupFile, BackupSchedule } from './data-management-types';

interface Props {
  backups: BackupFile[];
  creatingBackup: boolean;
  schedule: BackupSchedule;
  setSchedule: (s: BackupSchedule) => void;
  savingSchedule: boolean;
  onCreateBackup: () => void;
  onSaveSchedule: () => void;
  onDownload: (filename: string) => void;
  onOpenRestore: (filename: string) => void;
  formatFileSize: (bytes: number) => string;
}

export function BackupTab({ backups, creatingBackup, schedule, setSchedule, savingSchedule, onCreateBackup, onSaveSchedule, onDownload, onOpenRestore, formatFileSize }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Automatic Backup Schedule</CardTitle>
          <CardDescription>Configure when to automatically backup your database.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="backup-enabled" className="flex flex-col gap-1">
              <span>Enable Scheduled Backups</span>
              <span className="font-normal text-xs text-muted-foreground">Backups will run automatically</span>
            </Label>
            <Switch id="backup-enabled" checked={schedule.enabled} onCheckedChange={(checked) => setSchedule({ ...schedule, enabled: checked })} />
          </div>
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={schedule.frequency} onValueChange={(val: 'daily' | 'weekly') => setSchedule({ ...schedule, frequency: val })} disabled={!schedule.enabled}>
              <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
              <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent>
            </Select>
          </div>
          {schedule.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label>Day of Week</Label>
              <Select value={schedule.dayOfWeek?.toString()} onValueChange={(val) => setSchedule({ ...schedule, dayOfWeek: parseInt(val) })} disabled={!schedule.enabled}>
                <SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger>
                <SelectContent>
                  {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, i) => (
                    <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Time (24h)</Label>
            <Input type="time" value={schedule.time} onChange={(e) => setSchedule({ ...schedule, time: e.target.value })} disabled={!schedule.enabled} />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onSaveSchedule} disabled={savingSchedule} className="ml-auto">
            {savingSchedule ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
            Save Schedule
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Backup</CardTitle>
          <CardDescription>Create an immediate backup or manage existing files.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="w-full" variant="outline" onClick={onCreateBackup} disabled={creatingBackup}>
            {creatingBackup
              ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Creating Backup...</>
              : <><HardDrive className="mr-2 h-4 w-4" />Create Backup Now</>}
          </Button>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Recent Backups</h4>
            <div className="border rounded-md divide-y max-h-[250px] overflow-y-auto">
              {backups.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No backups found.</div>
              ) : backups.map((file) => (
                <div key={file.name} className="flex items-center justify-between p-3 text-sm">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col truncate">
                      <span className="truncate font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(file.created), 'MMM d, yyyy HH:mm')} • {formatFileSize(file.size)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onOpenRestore(file.name)} className="text-orange-500 hover:text-orange-600 hover:bg-orange-50" title="Restore this backup">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDownload(file.name)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
