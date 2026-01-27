import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const COMMON_JOB_ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Data Analyst",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Cloud Engineer",
  "Product Manager",
  "UX Designer",
  "UI Developer",
  "Mobile Developer",
  "QA Engineer",
  "Security Engineer",
  "Business Analyst",
  "Technical Writer",
  "Solutions Architect",
  "Site Reliability Engineer",
  "Data Engineer",
  "AI/ML Engineer",
  "Blockchain Developer",
  "Game Developer",
  "Systems Administrator",
  "Network Engineer",
];

interface JobRoleComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function JobRoleCombobox({ value, onChange }: JobRoleComboboxProps) {
  const [open, setOpen] = useState(false);
  const [customRole, setCustomRole] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSelectRole = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setShowCustomInput(false);
    setCustomRole("");
  };

  const handleAddCustomRole = () => {
    if (customRole.trim()) {
      onChange(customRole.trim());
      setCustomRole("");
      setShowCustomInput(false);
      setOpen(false);
    }
  };

  const isCustomRole = value && !COMMON_JOB_ROLES.includes(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full sm:w-[280px] justify-between"
        >
          <span className="truncate">
            {value || "Select or type job role..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search or type custom role..." />
          <CommandList>
            <CommandEmpty>
              <div className="p-2 text-center text-sm text-muted-foreground">
                No matching roles found
              </div>
            </CommandEmpty>
            <CommandGroup heading="Common Roles">
              {COMMON_JOB_ROLES.map((role) => (
                <CommandItem
                  key={role}
                  value={role}
                  onSelect={() => handleSelectRole(role)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === role ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {role}
                </CommandItem>
              ))}
            </CommandGroup>
            
            {isCustomRole && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Custom Role">
                  <CommandItem value={value} onSelect={() => handleSelectRole(value)}>
                    <Check className="mr-2 h-4 w-4 opacity-100" />
                    {value}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
            
            <CommandSeparator />
            <div className="p-2">
              {showCustomInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Type custom role..."
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomRole();
                      }
                    }}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={handleAddCustomRole}
                    disabled={!customRole.trim()}
                    className="h-8 px-2"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => setShowCustomInput(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add custom role...
                </Button>
              )}
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}