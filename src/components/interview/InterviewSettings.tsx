import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Mic, Speaker, Video, Eye, Gauge, Captions, Save, Bot } from "lucide-react";

interface InterviewSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: InterviewSettingsState;
  onSettingsChange: (settings: InterviewSettingsState) => void;
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
}

export interface InterviewSettingsState {
  selectedMic: string;
  selectedSpeaker: string;
  cameraEnabled: boolean;
  avatarVisible: boolean;
  avatarProvider: "simli" | "did";
  voiceSpeed: number;
  captionsEnabled: boolean;
}

const InterviewSettings = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  audioInputDevices,
  audioOutputDevices,
}: InterviewSettingsProps) => {
  const [localSettings, setLocalSettings] = useState<InterviewSettingsState>(settings);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    // Save to localStorage for persistence
    localStorage.setItem('interviewSettings', JSON.stringify(localSettings));
    onOpenChange(false);
  };

  const getVoiceSpeedLabel = (speed: number) => {
    if (speed <= 0.75) return "Slow";
    if (speed >= 1.25) return "Fast";
    return "Normal";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Interview Settings</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Microphone Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Microphone
            </Label>
            <Select
              value={localSettings.selectedMic}
              onValueChange={(value) => setLocalSettings({ ...localSettings, selectedMic: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                {audioInputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Speaker Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Speaker className="w-4 h-4" />
              Speaker
            </Label>
            <Select
              value={localSettings.selectedSpeaker}
              onValueChange={(value) => setLocalSettings({ ...localSettings, selectedSpeaker: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select speaker" />
              </SelectTrigger>
              <SelectContent>
                {audioOutputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label || `Speaker ${device.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Camera Toggle */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Camera
            </Label>
            <Switch
              checked={localSettings.cameraEnabled}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, cameraEnabled: checked })}
            />
          </div>

          {/* Avatar Visibility Toggle */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Show AI Avatar
            </Label>
            <Switch
              checked={localSettings.avatarVisible}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, avatarVisible: checked })}
            />
          </div>

          {/* Avatar Provider Selection */}
          {localSettings.avatarVisible && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Avatar Provider
              </Label>
              <Select
                value={localSettings.avatarProvider}
                onValueChange={(value: "simli" | "did") => setLocalSettings({ ...localSettings, avatarProvider: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simli">Simli (Real-time Lipsync)</SelectItem>
                  <SelectItem value="did">D-ID (Legacy)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Voice Speed */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Voice Speed: {getVoiceSpeedLabel(localSettings.voiceSpeed)}
            </Label>
            <div className="px-2">
              <Slider
                value={[localSettings.voiceSpeed]}
                onValueChange={([value]) => setLocalSettings({ ...localSettings, voiceSpeed: value })}
                min={0.75}
                max={1.25}
                step={0.25}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>
          </div>

          {/* Captions Toggle */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Captions className="w-4 h-4" />
              Captions/Subtitles
            </Label>
            <Switch
              checked={localSettings.captionsEnabled}
              onCheckedChange={(checked) => setLocalSettings({ ...localSettings, captionsEnabled: checked })}
            />
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default InterviewSettings;